# Session Brief

**Copy this into a new session to bootstrap AI context.**

## Project

Re-Checklist — multi-tenant kitchen operations checklist backend. NestJS 10, TypeScript, Prisma, PostgreSQL.

## Key Docs

- `/docs/ai/00-artemis-operating-contract.md` — Rules and workflow
- `/docs/ai/01-system-architecture.md` — Stack, modules, patterns
- `/docs/ai/04-domain-model.md` — Entities and relationships
- `/docs/ai/05-api-surface.md` — Endpoints and permissions
- `/docs/ai/07-next-steps.md` — Recommended work

## Development Rules

1. Architecture reasoning first; identify risks before coding.
2. Minimal, production-safe changes; no API breakage.
3. Preserve tenant safety, audit safety, query efficiency.
4. Delegate to existing services; no logic duplication.
5. Summarize files changed, behavior, and assumptions after implementation.

## Current State

- Checklist engine: templates, schedules, runs, snapshots, execution lifecycle.
- Alerts: OPEN/ACKNOWLEDGED/RESOLVED; linked to failed run items.
- Domain events: run-item.failed, run.completed, alert.acknowledged, alert.resolved.
- Supervisor APIs: today, overdue, failed, metrics, summary, acknowledge/resolve convenience endpoints.
