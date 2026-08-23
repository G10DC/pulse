---
name: pulse
status: implemented
description: >-
  Composite health score (0-10) that invokes mirror and lookout on the target
  directory and blends their verdicts with caller-supplied mutation-score and
  README-presence signals into a weighted average over the components it could
  actually measure. Unmeasured components are reported as unknown and excluded
  from the score -- never assumed to pass. Use when you need a quick quality
  snapshot across multiple dimensions. Never reimplement individual analysis
  passes -- delegate to mirror, lookout, and forge; never use as a substitute
  for actual code review.
---

# Pulse

Blends four signals into one composite score (0-10): a code-review verdict, a dependency-audit verdict, a mutation-test score, and README presence. **The one skill in this family with real cross-skill wiring.**

## What it actually does
`synthesize()` is `async`: it dynamically `import()`s `MirrorReviewer`/`LookoutAuditor` from the
sibling `mirror`/`lookout` skill directories and calls them, unless you pass
`metrics.mirrorVerdict`/`lookoutVerdict` yourself. Dynamic, not static, import — pulse only works
standalone (e.g. cloned alone in CI, with no sibling repos on disk) because of this; a static
import would crash the module entirely when `mirror`/`lookout` aren't present.

**Golden rule: a missing measurement is never a passing measurement.**

When an input cannot be obtained, that component is `null` in the breakdown, listed in
`unknowns`, and **excluded from the weighted average** — the remaining weights are renormalised
over what was actually measured. `coverage` reports the fraction measured. With nothing
measurable, `healthScore` is `null` and `status` is `INSUFFICIENT_DATA`.

`mirrorScore` needs a real diff: pass `metrics.diffText` (or a precomputed `metrics.mirrorVerdict`).
Mirror is **not** invoked on a placeholder string any more — a verdict on fake input describes
nothing. Lookout's call is real (reads `<targetDir>/package.json`). `mutationScore` and `hasReadme`
are **not computed** — supply them or the component is unknown.

Base weights: Mirror 30%, Lookout 30%, mutation 20%, docs 20%, renormalised over measured
components. A score >= 8.0 with coverage < 0.75 is reported as `GOOD_PARTIAL`, not `EXCELLENT`:
a high score on one component out of four is a statement about the sample, not the project.

**The floor overrides the mean.** Any measured component at or below 2/10 forces
`status: 'CRITICAL'` and is named in `critical[]`, whatever the weighted average says.
Without it, PASS + PASS + README + a mutation score of 0 lands on exactly 8.0 and reads
as EXCELLENT — a suite that kills no mutations, summarised as excellent health. A mean
that can hide the worst dimension is not a summary of the project.

### Why this changed
Until 2026-08-24 the absent-input paths defaulted optimistically: `mutationScore` to 7.5/10,
`hasReadme` to present, and both Mirror and Lookout to `PASS` on any exception. `synthesize({})`
therefore returned **9.5 / EXCELLENT**. Observed in practice on a branch where a mutation tester
had just measured 0/4 mutations killed: pulse reported `mutationCoverage: 7.5` and `EXCELLENT` on
a suite that verified nothing. A health score is the last number anyone reads; when it is the
absence of evidence that produces the good number, nothing downstream catches it.

## Usage (library, not a CLI)

```js
import { PulseSynthesizer } from './lib/pulse.js';

const result = await new PulseSynthesizer().synthesize(
  { mirrorVerdict: realMirrorResult.verdict, mutationScore: forgeResult?.score, hasReadme: fs.existsSync('README.md') },
  '/path/to/project'
);
// result.healthScore, result.status, result.breakdown
```

## When to use

- One composite number for dependency health (real) plus code-review/mutation/docs signals (real
  if supplied, placeholder otherwise).

## When NOT to use

- **As a substitute for reading the underlying Mirror/Lookout/Forge findings** — the score
  compresses away specifics.
- **Expecting the auto-invoked Mirror score to reflect your code** — it doesn't, by default.
