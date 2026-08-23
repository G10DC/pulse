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
