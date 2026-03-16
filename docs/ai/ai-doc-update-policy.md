# AI Doc Update Policy

**When to update `/docs/ai` and `/scripts/ai`**

## Update Required

Update the AI Collaboration Kit when you change:

- **Checklist engine** — templates, schedules, runs, snapshots, execution logic
- **Alert system** — alert lifecycle, linkage, status flows
- **Temperature** — policies, readings, breach handling
- **Files & attachments** — registration, linkage, ownership
- **Schema** — Prisma models, migrations

## What to Update

| Change type | Update |
|-------------|--------|
| New endpoint | `05-api-surface.md` |
| New feature | `02-current-progress.md`, `05-api-surface.md` if API |
| Architecture decision | `06-decisions-log.md` |
| New module or pattern | `01-system-architecture.md` |
| Domain model change | `04-domain-model.md` |
| New workflow step | `08-cursor-workflow.md` or `03-development-playbook.md` |

## When Not Required

- Bug fixes that don't change behavior or contracts
- Test-only changes
- Config or env changes
- Dependency bumps without API impact

## Before Merging

If the CI workflow comments on your PR about AI docs, review this policy and update the relevant docs.
