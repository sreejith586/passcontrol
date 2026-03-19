# Checkpoint 2025-03-20 (Phase 8A Alert List Power Features)

**Date:** 2025-03-20  
**Session focus:** Phase 8A alert list enhancements, backend date filter fix

## Completed

- [x] Phase 8A — Alert List Power Features: bulk acknowledge, bulk resolve, richer filters (severity, sourceType, from, to, assignedUserId), row selection (page-local, select-all), collapsible advanced filters
- [x] Backend date filter fix: date-only `to` (YYYY-MM-DD) now means through end of day UTC; use `lt` next day instead of `lte` same-day midnight; full ISO datetime preserves precise `lte`

## Files Changed

| File | Change |
|------|--------|
| frontend/src/features/alerts/AlertListPage.tsx | Richer filters, row selection, bulk actions bar, BulkResolveModal |
| frontend/src/features/alerts/api.ts | bulkAcknowledgeAlerts, bulkResolveAlerts |
| frontend/src/features/alerts/components/BulkResolveModal.tsx | New modal for bulk resolve with optional note |
| frontend/src/shared/layout/FilterBar.tsx | FilterInput for text/date |
| src/alert-events/repositories/alert-events.repository.ts | Date-only `to` → `lt` next day UTC |
| src/alert-events/repositories/alert-events.repository.spec.ts | alertEvent mock; 4 list date-filter tests |
| docs/ai/02-current-progress.md | Phase 8A, backend date filter fix |
| docs/ai/05-api-surface.md | GET /alert-events list query params and date semantics |
| docs/ai/06-decisions-log.md | Alert list date-only "to" filter semantics |
| docs/ai/07-next-steps.md | Phase 8A complete, Phase 8B recommended |

## Decisions Made

- Alert list date-only "to": convert to next day UTC, use `lt` (exclusive) so full day included; full ISO datetime keeps precise `lte`.
- Phase 8A scope: no brand/location/zone filters (no reusable selectors); assignedUserId uses users list (limit 100).

## Blockers / Open Questions

- Escalations filter parity not done (assignedToMe, unassignedOnly, etc.).
- Comments UI still only supports COMMENT, not RESOLUTION_NOTE.

## Next Session

1. Phase 8B: Escalations filter parity
2. Comments UI: add RESOLUTION_NOTE option
3. Consider applying date-only "to" semantics to other endpoints (getTrends, escalations trends) if they have same bug

## Context Snapshot

- Current progress: Phase 8A complete; alert list has bulk actions and richer filters; date filter correctly includes full UTC day for `to`.
- Next steps doc: Updated (Phase 8A done; Phase 8B recommended).
