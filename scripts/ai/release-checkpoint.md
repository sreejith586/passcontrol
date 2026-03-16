# Release Checkpoint

**Purpose:** Capture project state before a release; ensure docs match shipped behavior.

## Pre-Release Checklist

1. **Run full test suite** — `npm test`
2. **Build** — `npm run build`
3. **Update `/docs/ai/02-current-progress.md`** — All implemented features are checked
4. **Update `/docs/ai/05-api-surface.md`** — All public endpoints documented
5. **Update `/docs/ai/07-next-steps.md`** — Reflect post-release priorities
6. **Tag release** — Commit with message like `chore: release checkpoint v0.x.x`

## Post-Release

- [ ] 02-current-progress.md is accurate
- [ ] 05-api-surface.md matches deployed API
- [ ] 07-next-steps.md has next iteration items
- [ ] No placeholder or TODO items in shipped docs

## Notes

- Do not invent features; only document what exists in the codebase.
- If a feature was removed, uncheck or remove from checklist.
