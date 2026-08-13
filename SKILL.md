---
name: pulse
status: implemented
description: >-
  Composite health score (0-10) that genuinely invokes mirror and lookout on the
  target directory and blends their verdicts with caller-supplied mutation-score
  and README-presence signals into a weighted average. Use when you need a quick
  quality snapshot of a project across multiple dimensions. Never reimplement
  individual analysis passes -- delegate to mirror, lookout, and forge; never use
  as a substitute for actual code review.
---

# Pulse

Blends four signals into one composite score (0-10): a code-review verdict, a dependency-audit verdict, a mutation-test score, and README presence. **The one skill in this family with real cross-skill wiring.**

## What it actually does
`synthesize()` is `async`: it dynamically `import()`s `MirrorReviewer`/`LookoutAuditor` from the
sibling `mirror`/`lookout` skill directories and calls them, unless you pass
`metrics.mirrorVerdict`/`lookoutVerdict` yourself. Dynamic, not static, import — pulse only works
standalone (e.g. cloned alone in CI, with no sibling repos on disk) because of this; a static
import would crash the module entirely when `mirror`/`lookout` aren't present, and it falls back
to a neutral `PASS` in that case. **Caveat**: its own Mirror call reviews a fixed placeholder
string (`'+ const dummy = true;'`), not your real diff — pass `metrics.mirrorVerdict` from a real
review if you want that component meaningful. Lookout's call is real and useful as-is (reads
`<targetDir>/package.json`). `mutationScore` and `hasReadme` are **not computed** — supply them or
they default to neutral placeholders. Weights: Mirror 30%, Lookout 30%, mutation 20%, docs 20%.

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
