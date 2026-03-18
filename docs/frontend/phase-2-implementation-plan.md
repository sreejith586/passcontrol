# Phase 2 Implementation Plan

**Scope:** Escalations, Organization Workflow Settings, Minimal Dashboard, Polish

---

## 1. Endpoint Confirmation

### Escalations
| Endpoint | Method | Permission | Response |
|----------|--------|------------|----------|
| `/alert-events/escalations` | GET | alert.view | `{ items, total, page, limit }` — paginated list with sla.acknowledgeBreached, sla.resolveBreached |
| `/alert-events/escalations/summary` | GET | alert.view | `{ totalActiveAlerts, acknowledgeBreached, resolveBreached, bySeverity }` |
| `/alert-events/escalations/prioritized` | GET | alert.view | `{ items }` — top N by urgency (limit param) |

Query params (escalations list): brandId, locationId, zoneId, severity, status (OPEN|ACKNOWLEDGED), assignedUserId, assignedToMe, unassignedOnly, onlyBreached, page, limit.

### Organization Settings
| Endpoint | Method | Permission | Response |
|----------|--------|------------|----------|
| `/organization-settings/alert-workflow` | GET | alert.workflow-policy.view | `{ requireResolutionNoteOnResolve, requireReopenNoteOnReopen }` |
| `/organization-settings/alert-workflow` | PATCH | alert.workflow-policy.manage | Same shape (partial body) |

### Dashboard (minimal)
| Endpoint | Method | Permission | Response |
|----------|--------|------------|----------|
| `/checklist-runs/metrics` | GET | checklist.run.view | `{ todayRuns, overdueRuns, failedRuns, openAlerts, acknowledgedAlerts, resolvedAlertsToday }` |
| `/alert-events/escalations/summary` | GET | alert.view | `{ totalActiveAlerts, acknowledgeBreached, resolveBreached, bySeverity }` |
| `/alert-events/escalations/prioritized` | GET | alert.view | `{ items }` — top 10 for widget |

Dashboard shows metrics based on available permissions. No invented metrics.

---

## 2. Dashboard Scope (Minimal)

- Cards for metrics the user has permission to see
- If checklist.run.view: todayRuns, overdueRuns, failedRuns, openAlerts, acknowledgedAlerts, resolvedAlertsToday
- If alert.view only: escalation summary (totalActiveAlerts, acknowledgeBreached, resolveBreached) + prioritized widget (top 10)
- If both: combined view
- No charts, no trends for Phase 2 (those endpoints exist but keep dashboard minimal)

---

## 3. File Tree (Phase 2 Additions)

```
frontend/src/
├── features/
│   ├── escalations/
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── query-keys.ts
│   │   ├── EscalationsPage.tsx
│   │   └── components/
│   │       └── EscalationTableColumns.tsx (shared column config)
│   ├── organization-settings/
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── query-keys.ts
│   │   ├── AlertWorkflowSettingsPage.tsx
│   │   └── components/
│   │       └── WorkflowPolicyForm.tsx
│   └── dashboard/
│       ├── api.ts
│       ├── types.ts
│       ├── query-keys.ts
│       └── DashboardPage.tsx
├── core/api/
│   └── contracts.md (update with new endpoints)
```

---

## 4. Build Order

1. Escalations API + types + EscalationsPage
2. Organization settings API + AlertWorkflowSettingsPage
3. Dashboard API + DashboardPage
4. Router updates
5. Polish: Alert List (breadcrumbs, empty state), Alert Detail (breadcrumbs)
