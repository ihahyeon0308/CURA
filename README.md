# CURA

Seoul hospital comparison and decision-support MVP.

## Codex harness

This repository uses text documents as a project-specific harness for Codex.
The goal is not just to describe the product, but to keep AI work scoped,
phase-based, and auditable.

## Document map

- `CLAUDE.md`: project constitution, document priority, working modes, and
  stop conditions
- `docs/research.md`: product intent, domain constraints, legal risks, and
  research-only guidance
- `docs/plan.md`: executable architecture plan and system boundaries
- `docs/adr.md`: durable decisions and tradeoffs that should not drift silently
- `docs/implement.md`: phase-by-phase implementation harness and progress log
- `docs/prompt.md`: reusable prompts for interactive and headless Codex sessions

## Working modes

1. Discovery mode
   - Default mode.
   - Refine research, plan, ADRs, prompts, and implementation phases.
   - Do not ship product code unless the user explicitly activates build mode.
2. Build mode
   - Activated only when the user explicitly says `구현해`.
   - Implement one bounded phase at a time using `CLAUDE.md`,
     `docs/implement.md`, `docs/plan.md`, and `docs/adr.md`.
3. Review mode
   - Check code against the architecture, ADRs, and critical rules in
     `CLAUDE.md`.

## Recommended Codex workflow

1. Start with `CLAUDE.md`.
2. Read the relevant section in `docs/research.md` to confirm scope and risks.
3. Use `docs/plan.md` to identify the affected modules and architecture edges.
4. Confirm the decision still matches `docs/adr.md`.
5. If the user says `구현해`, pick the next unfinished phase in
   `docs/implement.md`.
6. Reuse or adapt prompts from `docs/prompt.md` when you want a stable task
   template.

## Apps

- `apps/web`: Next.js App Router frontend
- `apps/api`: NestJS API
- `analytics-service`: Python analytics worker API
- `libs/contracts`: shared TypeScript contracts
- `libs/domain`: sample data and domain logic

## Current status

- The workspace already contains seeded data, typed domain services, and an
  initial UI and API scaffold.
- The main gap is moving from seeded and in-process behavior to real
  PostgreSQL, Redis, and OpenSearch-backed flows without losing the existing
  product shape.
