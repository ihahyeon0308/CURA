# CURA

Seoul hospital comparison and decision-support MVP.

## Apps

- `apps/web`: Next.js App Router frontend
- `apps/api`: NestJS API
- `analytics-service`: Python analytics worker API
- `libs/contracts`: shared TypeScript contracts
- `libs/domain`: sample data and domain logic

## Notes

- This repository currently ships with seeded data and typed domain services so the UI and API can be wired before full infrastructure setup.
- PostgreSQL, Redis, and OpenSearch are represented in the architecture and container scaffolding, while the current implementation uses in-process seed data for MVP iteration.
