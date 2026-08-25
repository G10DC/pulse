import test from 'node:test';
import assert from 'node:assert/strict';
import { PulseSynthesizer } from '../lib/pulse.js';

test('PulseSynthesizer computes composite health score', async () => {
  const pulse = new PulseSynthesizer();
  const report = await pulse.synthesize({
    mirrorVerdict: 'PASS',
    lookoutVerdict: 'PASS',
    mutationScore: 85,
    hasReadme: true,
    hasLicense: true
  });

  assert.equal(report.healthScore, 9.7);
  assert.equal(report.status, 'EXCELLENT');
});

// --- regression: a missing measurement is not a passing measurement ---------
//
// Before this suite existed, synthesize({}) returned healthScore 9.5 / EXCELLENT:
// mutationCoverage silently defaulted to 7.5, documentation to 10, and both
// Mirror and Lookout fell back to 'PASS' when their sibling skills were absent.
// A project with no tests, no README and no audit therefore scored "EXCELLENT".

test('reports INSUFFICIENT_DATA instead of a score when nothing is measurable', async () => {
  const report = await new PulseSynthesizer().synthesize({}, '/nonexistent-dir-for-test');

  assert.equal(report.healthScore, null);
  assert.equal(report.status, 'INSUFFICIENT_DATA');
  assert.equal(report.coverage, 0);
  assert.ok(report.unknowns.length > 0, 'must enumerate what it could not measure');
});

test('a mutation score of 0 is scored as 0, not defaulted to a pass', async () => {
  const report = await new PulseSynthesizer().synthesize({
    mirrorVerdict: 'PASS',
    lookoutVerdict: 'PASS',
    mutationScore: 0,
    hasReadme: true,
  });

  assert.equal(report.breakdown.mutationCoverage, 0);
  assert.ok(report.healthScore < 9.5, `expected a penalised score, got ${report.healthScore}`);
});

test('unmeasured components are excluded from the score, not assumed to pass', async () => {
  const report = await new PulseSynthesizer().synthesize({ mutationScore: 0 }, '/nonexistent-dir-for-test');

  assert.equal(report.breakdown.codeReview, null);
  assert.equal(report.breakdown.dependencySecurity, null);
  assert.equal(report.healthScore, 0, 'the only measured component scored 0');
  assert.ok(report.coverage < 1);
});

test('a high score on partial coverage is not reported as EXCELLENT', async () => {
  const report = await new PulseSynthesizer().synthesize(
    { mirrorVerdict: 'PASS' },
    '/nonexistent-dir-for-test',
  );

  assert.equal(report.healthScore, 10);
  assert.equal(report.status, 'GOOD_PARTIAL', 'coverage 0.25 must not yield EXCELLENT');
});

test('Mirror is not invoked on a placeholder diff', async () => {
  const report = await new PulseSynthesizer().synthesize({}, '/nonexistent-dir-for-test');

  assert.equal(report.breakdown.codeReview, null);
  assert.ok(report.unknowns.some((u) => u.startsWith('codeReview')));
});

// --- regression: a catastrophic component cannot be averaged away -----------
//
// PASS + PASS + README + a mutation score of 0 lands on exactly 8.0, which the
// old thresholds reported as EXCELLENT: a test suite that kills no mutations at
// all, summarised as excellent health. A mean that can hide the worst dimension
// is not a summary of the project.

test('a component at the critical floor forces CRITICAL regardless of the mean', async () => {
  const report = await new PulseSynthesizer().synthesize({
    mirrorVerdict: 'PASS',
    lookoutVerdict: 'PASS',
    mutationScore: 0,
    hasReadme: true,
  });

  assert.equal(report.healthScore, 8, 'the weighted mean is unchanged');
  assert.equal(report.status, 'CRITICAL', 'but the verdict is not EXCELLENT');
  assert.deepEqual(report.critical, ['mutationCoverage']);
});

test('a healthy project is still EXCELLENT', async () => {
  const report = await new PulseSynthesizer().synthesize({
    mirrorVerdict: 'PASS',
    lookoutVerdict: 'PASS',
    mutationScore: 100,
    hasReadme: true,
  });

  assert.equal(report.status, 'EXCELLENT');
  assert.deepEqual(report.critical, []);
});

test('a failing dependency audit is critical too', async () => {
  const report = await new PulseSynthesizer().synthesize({
    mirrorVerdict: 'PASS',
    lookoutVerdict: 'FAIL',
    mutationScore: 100,
    hasReadme: true,
  });

  assert.equal(report.status, 'CRITICAL');
  assert.deepEqual(report.critical, ['dependencySecurity']);
});

// A verdict can be honest and still be narrower than the component it scores. lookout
// consults no advisory database and reads no lockfile, so its PASS means "clean
// manifest", not "clean dependency tree" — and scoring it as a full 10 for
// dependencySecurity substitutes a good default for evidence never gathered. That is
// this module's own failure mode, arriving one level further out than last time.
test('a source that declares its blind spots does not score full marks', async () => {
  const pulse = new PulseSynthesizer();

  const opaque = await pulse.synthesize({
    mirrorVerdict: 'PASS', lookoutVerdict: 'PASS', mutationScore: 100, hasReadme: true,
  });
  assert.equal(opaque.breakdown.dependencySecurity, 10);

  const declared = await pulse.synthesize({
    mirrorVerdict: 'PASS',
    lookoutVerdict: 'PASS',
    lookoutUnknowns: ['known vulnerabilities: no advisory database is consulted'],
    mutationScore: 100,
    hasReadme: true,
  });
  assert.ok(declared.breakdown.dependencySecurity < 10,
    'a manifest-only check certified the dependency tree at full marks');
  assert.ok(declared.healthScore < opaque.healthScore);
});

// The blind spots have to reach a reader. Capping the number and dropping the reason
// would leave the score lower and nobody able to say why.
test('the blind spots are carried into unknowns, not just into the number', async () => {
  const declared = await new PulseSynthesizer().synthesize({
    mirrorVerdict: 'PASS',
    lookoutVerdict: 'PASS',
    lookoutUnknowns: ['no lockfile is read', 'no advisory database is consulted'],
    mutationScore: 100,
    hasReadme: true,
  });
  assert.equal(declared.unknowns.filter((u) => /dependencySecurity/.test(u)).length, 2);
  assert.match(declared.unknowns.join(' '), /advisory database/);
});

// A component that was measured is still a component: capping is not excluding.
test('a partially scoped component still counts towards coverage', async () => {
  const declared = await new PulseSynthesizer().synthesize({
    mirrorVerdict: 'PASS',
    lookoutVerdict: 'PASS',
    lookoutUnknowns: ['no advisory database is consulted'],
    mutationScore: 100,
    hasReadme: true,
  });
  assert.equal(declared.coverage, 1);
  assert.notEqual(declared.breakdown.dependencySecurity, null);
});
