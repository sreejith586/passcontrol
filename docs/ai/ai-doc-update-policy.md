# AI Doc Update Policy

**When to update the AI Collaboration Kit (`docs/ai/`, `scripts/ai/`)**

## Scope

The AI Doc Guard treats changes under `src/`, `scripts/`, and `prisma/` as potentially architecture-impacting. If you change any of these paths without also updating `docs/ai/` or `scripts/ai/`, the workflow will add a reminder comment on your PR.

## Update Required

Update the AI Collaboration Kit when you change architecture, APIs, or domain behavior:

- **New or changed endpoints** — `05-api-surface.md`
- **New features or modules** — `02-current-progress.md`, `01-system-architecture.md`, `05-api-surface.md` if API
- **Architecture decisions** — `06-decisions-log.md`
- **Domain model changes** — `04-domain-model.md`
- **Workflow or playbook changes** — `08-cursor-workflow.md`, `03-development-playbook.md`

## When Not Required (Can Ignore the Warning)

- **Purely internal changes** — Refactors, renames, code moves with no behavior change
- **Bug fixes** — That don't change contracts or observable behavior
- **Test-only changes** — New or updated tests
- **Config or env** — No API or domain impact
- **Dependency bumps** — Without API or behavior impact

## Before Merging

If the CI workflow comments on your PR, review this policy. If your changes are purely internal, you can ignore the reminder. Otherwise, update the relevant docs.
