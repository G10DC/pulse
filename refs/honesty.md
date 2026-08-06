# Pulse Project Health Score Synthesizer Honesty Bounds

The honesty layer is the operational expression of the **G10DC Trellis Standard**: **the processing engine reasons over verified evidence with stated confidence, never hallucinates capabilities or impact.**

## Domain & Scope
**Domain**: Composite System Quality Score Computation

## Core Epistemic Rules

1. **Aggregation Integrity: Health score (0-10) synthesizes mirror, lookout, forge, and docs metrics without hallucinating.**
2. **Metric Provenance: Every component score explicitly references its underlying source tool output.**
3. **Confidence Rating: High (all 4 metrics populated), Medium (2-3 metrics populated), Low (single metric score).**

## Three-Tier Confidence Model

- **High Confidence**: Full AST/schema validation passing, deterministic evidence available, verified state.
- **Medium Confidence**: Heuristic analysis or partial indexing; requires agent verification step.
- **Low Confidence**: Inferred or unindexed target; candidate output ONLY, never auto-committed.

## Epistemic Invariant

> Absence of evidence is not evidence of absence. Output is presented as a structured candidate set with confidence scores so caveats cannot be silently dropped downstream.
