---
name: pulse
description: Project health and quality score synthesizer. Aggregates metrics across test suites, dependency audits, code hygiene, and documentation completeness into a single composite health score (0 to 10).
---

# 🧬 Pulse

Project Health & Quality Score Synthesizer. Pulse aggregates diagnostic metrics across test coverage, security scans, dependency hygiene, and documentation completeness into a unified composite project health score (0 - 10).

## 🎯 Scoring Dimensions

1. **🧪 Test Suite Strength** (0-2.5 pts): Verifies presence of unit test runners and test suites.
2. **🔒 Security & Dependencies** (0-2.5 pts): Scans manifest files for unpinned packages and missing lockfiles.
3. **🧹 Code Style & Linters** (0-2.5 pts): Checks for ESLint/Prettier configuration files.
4. **📚 Documentation Completeness** (0-2.5 pts): Evaluates `README.md`, `LICENSE`, and `CHANGELOG.md` presence.

## 🚀 Execution Guide

Evaluate project health in current directory:
```bash
node lib/pulse.js --dir "."
```


---

## ⚡ Spark Breakthrough Enhancement

- **Feature**: **Real-Time Project Health HUD**
- **Description**: Displays 0-10 composite health score on terminal launch.
- **Synergy**: Integrated with `archaeologist` (churn) & `lookout` (security).
- **Framework**: Applied via the `spark` 4-Lens Lateral Ideation Engine.
