# Update AI Context Checkpoint

**Purpose:** Refresh `/docs/ai` with current project state before a new session or handoff.

## Steps

1. **Review implementation changes** since last checkpoint.
2. **Update `/docs/ai/02-current-progress.md`** — Add completed features; uncheck if reverted.
3. **Update `/docs/ai/05-api-surface.md`** — Add/modify endpoints if API changed.
4. **Update `/docs/ai/06-decisions-log.md`** — Add any new architectural decisions.
5. **Update `/docs/ai/07-next-steps.md`** — Reflect completed work; add new recommendations.
6. **Fill `/docs/ai/checkpoint-template.md`** — Save session summary.

## Triggers

- End of implementation session
- Before handing off to another developer or AI session
- After a significant release

## Quick Checklist

- [ ] 02-current-progress.md reflects implemented features
- [ ] 05-api-surface.md matches actual routes
- [ ] 06-decisions-log.md has new decisions
- [ ] 07-next-steps.md is current
- [ ] checkpoint-template.md filled for this session
