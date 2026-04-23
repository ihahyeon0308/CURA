# CURA ADR

This file captures durable decisions that should not drift silently while Codex
implements features.

## How Codex should use this file

- Read this after `docs/plan.md` when a task changes architecture or
  cross-service behavior.
- Update it only when a decision meaningfully changes.
- Do not turn this into a changelog; keep it focused on decisions and their
  consequences.

## ADR-001: Use a docs-first Codex harness

- Status: accepted
- Context: CURA already has multiple planning documents, but they were easy for
  an agent to read as prose instead of as a workflow contract.
- Decision: treat `CLAUDE.md`, `docs/research.md`, `docs/plan.md`,
  `docs/implement.md`, and `docs/prompt.md` as an execution harness, not just
  reference material.
- Consequence: Codex should update documents before or alongside code whenever
  scope, architecture, or phase boundaries change.

## ADR-002: Gate implementation behind `구현해`

- Status: accepted
- Context: the repository contains both planning artifacts and scaffold code,
  which makes accidental broad implementation easy.
- Decision: discovery and planning are the default. Build mode starts only after
  the user explicitly says `구현해`.
- Consequence: planning prompts, research updates, and architecture work can
  happen safely without implicitly starting a full build.

## ADR-003: Keep the product surface in TypeScript and analytics in Python

- Status: accepted
- Context: the product needs shared contracts across frontend and API, but also
  benefits from Python for summarization, anomaly detection, and analytics.
- Decision: keep `apps/web`, `apps/api`, and `libs/contracts` TypeScript-first,
  while the analytics runtime stays in `analytics-service`.
- Consequence: cross-runtime contracts must stay explicit, but the product gets
  better iteration speed in both UI/API and analytics-heavy work.

## ADR-004: PostgreSQL is the source of truth; search is derived

- Status: accepted
- Context: the domain is relational, audit-heavy, and compliance-sensitive.
- Decision: store canonical entities, reviews, moderation history, and price
  evidence in PostgreSQL. Use OpenSearch-compatible indexing as a derived read
  model, not the canonical store.
- Consequence: write paths stay consistent, while search and recommendation
  views may be eventually consistent.

## ADR-005: Confidence and comparability are first-class product outputs

- Status: accepted
- Context: hospital-wide coverage creates uneven evidence quality and weak
  comparability across treatments.
- Decision: every ranking, recommendation, and price view must preserve
  confidence and comparability context instead of collapsing everything into one
  opaque score.
- Consequence: some views must show `insufficient evidence` or suppress price
  scoring entirely when the service cohort is weakly comparable.
