# CURA Codex Harness

This file is the project-specific harness on top of Codex's built-in safety
and tool rules.

## Purpose

- Keep CURA work aligned with the product scope and architecture.
- Prevent Codex from skipping straight from vague ideas to broad refactors.
- Make implementation phase-based, reviewable, and easy to resume.

## Source-of-truth order

1. Direct user instruction
2. `CLAUDE.md`
3. `docs/implement.md` after the user explicitly says `구현해`
4. `docs/plan.md`
5. `docs/adr.md`
6. `docs/research.md`
7. `docs/prompt.md`

If two documents disagree, pause, reconcile the docs, and then continue.

## Product boundary

- Geography stays limited to Seoul, South Korea.
- Domain stays focused on hospital and clinic comparison and decision support.
- Confidence, comparability, moderation, and legal defensibility are core
  product requirements, not polish items.

## Working modes

### 1. Discovery mode

This is the default.

Allowed work:

- refine research, architecture, ADRs, prompts, and implementation phases
- inspect the codebase and identify gaps
- prepare migration plans, test plans, and risk lists

Do not:

- start broad product implementation from this mode alone
- treat a planning document as automatic permission to code

Expected outputs:

- clarified scope
- concrete next phase
- updated documents when assumptions change

### 2. Build mode

Build mode activates only when the user explicitly says `구현해`.

Rules in build mode:

- work one bounded phase at a time from `docs/implement.md`
- use `docs/plan.md` as the architecture boundary
- keep `docs/adr.md` in sync when a durable decision changes
- avoid mock data in any path you touch for the active phase
- implement the smallest end-to-end slice that can be verified
- finish with validation plus a short progress update in `docs/implement.md`

### 3. Review mode

When reviewing code, prioritize:

- behavioral regressions
- mismatches with `docs/plan.md`
- violations of `docs/adr.md`
- breaches of the critical rules below
- missing tests or missing verification

## Critical rules

- Do not expand the product scope beyond the Seoul hospital MVP unless the
  user asks.
- Do not replace a real dependency with a seed or stub in code you modify.
- Do not blur institution-level, specialty-level, and treatment-level scoring.
- Do not publish price intelligence without preserving comparability context.
- Do not bypass moderation or privacy guardrails for user-generated content.
- Do not make large architecture changes without updating the plan and ADRs.

## Task loop

1. Restate the user goal and identify the active mode.
2. Read only the documents needed for the task.
3. Name the target phase and the non-goals for this turn.
4. Change the smallest useful set of files.
5. Verify with tests, builds, or focused checks when possible.
6. Record progress, open risks, or architecture changes in the relevant docs.

## Stop and escalate when

- the requested change conflicts with product scope or legal constraints
- a task requires a new durable architectural decision
- the next safe step is unclear because the docs conflict
- implementation would skip an unfinished dependency from an earlier phase

## Repository mental model

- `apps/web`: public and authenticated user experience
- `apps/api`: main operational API and orchestration
- `analytics-service`: Python runtime for analytics and AI-heavy tasks
- `libs/contracts`: shared API and event contracts
- `libs/domain`: domain logic and sample data used by the current scaffold
- `docs/`: the project harness that tells Codex what to do next
