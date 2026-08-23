/**
 * Pulse — Project Health & Quality Score Synthesizer
 *
 * Golden rule: a missing measurement is never a passing measurement.
 *
 * A health score is the last number anyone looks at. If an input is unavailable
 * and the synthesizer quietly substitutes a good default, the aggregate reads
 * "healthy" precisely when the evidence is absent — the most dangerous false
 * positive a quality tool can produce, because nothing else downstream will
 * catch it.
 *
 * Unknown components are therefore reported as unknown, excluded from the score,
 * and counted against `coverage`. A run that knows nothing returns no score at all.
 */
import path from 'node:path';

/** Relative weights. Only the components actually measured are normalised over. */
const WEIGHTS = {
  codeReview: 0.3,
  dependencySecurity: 0.3,
  mutationCoverage: 0.2,
  documentation: 0.2,
};

const verdictToScore = (verdict, scale) => {
  if (verdict == null) return null;
  return scale[verdict] ?? scale.DEFAULT ?? null;
};

export class PulseSynthesizer {
  /**
   * Synthesizes health metrics from the measurements it is given.
   *
   * Mirror and Lookout are loaded dynamically (not statically imported) because they
   * live in sibling skill directories that only exist in a local multi-skill workspace,
   * not in a standalone checkout of this repo (e.g. CI) — a static import would crash
   * the whole module there. When they are absent, the corresponding component is
   * `unknown`; it is NOT assumed to pass.
   *
   * @param {object} metrics
   * @param {string} [metrics.mirrorVerdict]   PASS | WARN | FAIL — precomputed Mirror verdict
   * @param {string} [metrics.lookoutVerdict]  PASS | WARN | FAIL — precomputed Lookout verdict
   * @param {string} [metrics.diffText]        real diff for Mirror; without it Mirror is skipped
   * @param {number} [metrics.mutationScore]   0-100, from a mutation tester
   * @param {boolean} [metrics.hasReadme]      documentation presence
   * @param {string} [targetDir]
   */
  async synthesize(metrics = {}, targetDir = process.cwd()) {
    const unknowns = [];

    // --- code review ------------------------------------------------------
    // Mirror is only meaningful on a real diff. Reviewing a placeholder string
    // produces a PASS that describes nothing, so an absent diff means unknown.
    let mirrorVerdict = metrics.mirrorVerdict ?? null;
    if (!mirrorVerdict && typeof metrics.diffText === 'string' && metrics.diffText.trim()) {
      try {
        const { MirrorReviewer } = await import('../../mirror/lib/mirror.js');
        mirrorVerdict = new MirrorReviewer().reviewDiff(metrics.diffText).verdict;
      } catch {
        mirrorVerdict = null; // sibling skill unavailable — unknown, not PASS
      }
    }
    if (!mirrorVerdict) unknowns.push('codeReview: no mirrorVerdict and no diffText to review');

    // --- dependency security ---------------------------------------------
    let lookoutVerdict = metrics.lookoutVerdict ?? null;
    if (!lookoutVerdict) {
      try {
        const { LookoutAuditor } = await import('../../lookout/lib/lookout.js');
        lookoutVerdict = new LookoutAuditor()
          .auditPackageJson(path.join(targetDir, 'package.json')).verdict;
      } catch {
        lookoutVerdict = null; // no package.json or skill unavailable — unknown
      }
    }
    if (!lookoutVerdict) unknowns.push('dependencySecurity: lookout unavailable or no package.json');

    // --- mutation coverage ------------------------------------------------
    // Previously defaulted to 7.5 when absent: a passing grade for a measurement
    // never taken. A suite whose mutation score is genuinely 0 now scores 0.
    const hasMutation = typeof metrics.mutationScore === 'number';
    if (!hasMutation) unknowns.push('mutationCoverage: no mutationScore supplied');

    // --- documentation ----------------------------------------------------
    const hasDocsSignal = typeof metrics.hasReadme === 'boolean';
    if (!hasDocsSignal) unknowns.push('documentation: hasReadme not supplied');

    const components = {
      codeReview: verdictToScore(mirrorVerdict, { PASS: 10, WARN: 7, DEFAULT: 3 }),
      dependencySecurity: verdictToScore(lookoutVerdict, { PASS: 10, WARN: 6, DEFAULT: 2 }),
      mutationCoverage: hasMutation ? Math.max(0, Math.min(10, metrics.mutationScore / 10)) : null,
      documentation: hasDocsSignal ? (metrics.hasReadme ? 10 : 5) : null,
    };

    const measured = Object.entries(components).filter(([, v]) => v !== null);
    const coverage = Number((measured.length / Object.keys(components).length).toFixed(2));

    // Nothing measured means nothing to report. Returning a number here would be
    // an opinion dressed as a measurement.
    if (measured.length === 0) {
      return {
        healthScore: null,
        status: 'INSUFFICIENT_DATA',
        coverage: 0,
        breakdown: components,
        unknowns,
        honest: 'No component could be measured. No score is reported: an absent measurement is not a passing one.',
      };
    }

    const totalWeight = measured.reduce((s, [k]) => s + WEIGHTS[k], 0);
    const healthScore = Number(
      measured.reduce((s, [k, v]) => s + v * (WEIGHTS[k] / totalWeight), 0).toFixed(1),
    );

    // Partial coverage caps the verdict: "EXCELLENT" on one measured component out
    // of four is a statement about the sample, not about the project.
    let status;
    if (healthScore >= 8.0) status = coverage >= 0.75 ? 'EXCELLENT' : 'GOOD_PARTIAL';
    else if (healthScore >= 6.0) status = 'GOOD';
    else status = 'NEEDS_IMPROVEMENT';

    return {
      healthScore,
      status,
      coverage,
      breakdown: components,
      unknowns,
      honest:
        `Score computed over ${measured.length}/4 components (coverage ${coverage}). ` +
        (unknowns.length
          ? `Unmeasured components are excluded, not assumed to pass: ${unknowns.map((u) => u.split(':')[0]).join(', ')}.`
          : 'All components measured.'),
    };
  }
}
