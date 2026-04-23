# CURA Implementation Harness

## Activation

This document becomes executable only after the user explicitly says `구현해`.
Before that, use it to plan, split phases, and identify gaps only.

## Purpose

- Turn the architecture into bounded implementation phases.
- Keep Codex focused on one vertical slice at a time.
- Make progress resumable without re-explaining the whole project.

## Global build rules

- Work one phase at a time unless the user explicitly asks for more.
- Finish each phase with code, verification, and a progress note.
- Do not skip earlier dependency phases just because a later UI change feels
  easier.
- Do not reintroduce mock data in any path touched by the active phase.
- If a phase changes a durable decision, update `docs/adr.md`.
- If a phase changes module boundaries or system shape, update `docs/plan.md`.

## Current baseline

- Workspace scaffold exists for `apps/web`, `apps/api`, `analytics-service`,
  `libs/contracts`, `libs/domain`, and `infra`.
- The current product surface is powered by seeded and in-process data paths.
- The main migration goal is to replace seeded behavior with real persistence,
  queueing, and search-backed flows while preserving the existing product shape.

## Phase ladder

### Phase 1: Persistence foundation

Goal:

- Introduce PostgreSQL-backed persistence for the canonical hospital and search
  read path.

Scope:

- database schema and migration strategy
- ORM or query layer setup
- repository replacement for the current seeded search and hospital reads

Definition of done:

- the canonical schema exists and can be migrated locally
- at least one real read path no longer depends on seeded in-memory data
- verification proves the API is reading persisted data

### Phase 2: Search vertical slice

Goal:

- Make `/search` a real end-to-end feature backed by persisted data and the
  chosen search strategy.

Scope:

- search indexing pipeline or fallback read strategy
- API contract for search
- frontend integration for real search results and filters

Definition of done:

- `GET /api/v1/search` returns real data
- the web search page consumes the real endpoint
- search relevance and empty states are verified

### Phase 3: Hospital detail and price intelligence

Goal:

- Move hospital detail views and treatment price analytics off the seeded path.

Scope:

- hospital detail query model
- specialty and treatment detail aggregation
- cohort-aware price statistics with comparability labels

Definition of done:

- hospital detail uses persisted data
- at least one treatment price view shows real cohort-backed analytics
- confidence and comparability remain visible in the UI or API

### Phase 4: Review, contribution, and moderation write path

Goal:

- Replace passive read-only scaffolding with real review and community writes.

Scope:

- authenticated write endpoints
- moderation status handling
- persistence for reviews, ratings, posts, and comments

Definition of done:

- at least one review submission flow works end to end
- moderation state is stored explicitly
- no write path bypasses validation or audit requirements

### Phase 5: Async jobs, analytics, and operational hardening

Goal:

- Introduce the background systems required for a credible MVP.

Scope:

- Redis-backed queueing
- index refresh and recomputation jobs
- analytics-service integration for summarization, sentiment, or anomaly tasks
- observability and failure handling

Definition of done:

- at least one background task is queued and processed successfully
- search or aggregate recomputation no longer depends on manual refresh
- failure handling is observable and does not silently corrupt state

## Progress log

| Phase | Status | Notes |
| --- | --- | --- |
| 1. Persistence foundation | completed | PostgreSQL schema, bootstrap migration/seed, and DB-backed repository for read paths were implemented. |
| 2. Search vertical slice | in_progress | Search and recommendations now read from PostgreSQL through API; dedicated search indexing is still pending. |
| 3. Hospital detail and price intelligence | pending | Detail and pricing logic still need a real storage-backed aggregation path. |
| 4. Review, contribution, and moderation write path | pending | Controllers exist in scaffold form, but durable write workflows are unfinished. |
| 5. Async jobs, analytics, and operational hardening | pending | Queueing and analytics integration are represented architecturally, not fully delivered. |

## Per-phase execution checklist

1. Read `CLAUDE.md`, the relevant section of `docs/plan.md`, and any affected ADR.
2. Restate the exact phase goal and today's non-goals.
3. Change only the files required for the active slice.
4. Verify with tests, local runs, or focused commands.
5. Update this file if phase status, blockers, or delivery order changed.

## Progress note template

Use this when a phase materially moves:

```md
### YYYY-MM-DD - Phase N

- Completed:
- Verified:
- Remaining:
- Risks / blockers:
- Docs updated:
```

### 2026-04-23 - Phase 1

- Completed: Added PostgreSQL wiring in API, migration/seed SQL, and repository queries for search, hospital, specialty, treatment, recommendation, community, and review write.
- Verified: TypeScript build/typecheck passes for `@cura/api` and `@cura/web`.
- Remaining: Replace in-DB bootstrap seed with official ingestion pipeline and add dedicated OpenSearch indexing layer.
- Risks / blockers: Current DB repository reads full tables before in-memory aggregation; acceptable for MVP sample size but not final scale.
- Docs updated: `docs/implement.md`.

### 2026-04-23 - Phase 2 (Search Sub-slice)

- Completed: Replaced web `GET /api/v1/search` local mock path with PostgreSQL-backed query and scoring flow.
- Verified: `corepack pnpm --filter @cura/web typecheck` passes after the change.
- Remaining: Search indexing pipeline (OpenSearch or equivalent derived index) is still pending.
- Risks / blockers: `@cura/web build` timed out in this session, likely due local runtime/file-lock conditions.
- Docs updated: `docs/implement.md`.
