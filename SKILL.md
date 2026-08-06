---
name: pulse
description: >-
  Project health and quality score synthesizer. Aggregates metrics from mirror,
  lookout, forge, and documentation completeness into a single composite health
  score (0 to 10). Use when you need a quick quality snapshot of a project
  across multiple dimensions. Never reimplement individual analysis passes --
  delegate to mirror, lookout, and forge; never use as a substitute for actual
  code review.
---

# Pulse

Project Health & Quality Score Synthesizer. Pulse aggregates diagnostic metrics across test coverage, security scans, dependency hygiene, and documentation completeness into a unified composite project health score (0 - 10).

## Scoring Dimensions

1. **🧪 Test Suite Strength** (0-2.5 pts): Verifies presence of unit test runners and test suites.
2. **🔒 Security & Dependencies** (0-2.5 pts): Scans manifest files for unpinned packages and missing lockfiles.
3. **🧹 Code Style & Linters** (0-2.5 pts): Checks for ESLint/Prettier configuration files.
4. **📚 Documentation Completeness** (0-2.5 pts): Evaluates `README.md`, `LICENSE`, and `CHANGELOG.md` presence.

## Execution Guide

Evaluate project health in current directory:
```bash
node lib/pulse.js --dir "."
```


---

## Spark Breakthrough Enhancement

- **Feature**: **Real-Time Project Health HUD**
- **Description**: Displays 0-10 composite health score on terminal launch.
- **Synergy**: Integrated with `archaeologist` (churn) & `lookout` (security).
- **Framework**: Applied via the `spark` 4-Lens Lateral Ideation Engine.


## When to use

- Primary domain workflow execution as specified in frontmatter description.


## When NOT to use

- Tasks outside declared skill scope or handled by specialized sibling skills.
