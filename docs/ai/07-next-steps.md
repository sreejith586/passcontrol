# Next Steps

**Review and update after each implementation session.**

---

## 1. Advanced Operational Intelligence (HIGH PRIORITY)

- **Escalation trends (time-based)** — Endpoint returning breach counts and active-alert counts over time buckets (day/week/month). Enables trend charts for escalation pressure.
- **SLA compliance metrics** — Endpoint or aggregation returning breached vs within-SLA ratios over a period (e.g. % acknowledged within SLA, % resolved within SLA). Supports compliance dashboards.

---

## 2. Supervisor / Action Layer (HIGH PRIORITY)

- **Bulk acknowledge alerts** — Endpoint to acknowledge multiple alerts by ID in one request. Reduces round-trips for supervisors clearing many alerts.
- **Bulk resolve alerts** — Endpoint to resolve multiple alerts by ID in one request. Optional resolution note applied to all.
- **Prioritized escalation retrieval (top N)** — Lightweight endpoint returning top N escalations by severity and breach duration (e.g. longest-breached first). For dashboard widgets and quick triage.
- **Alert assignment / ownership** *(optional future)* — Model and APIs for assigning alerts to users; ownership tracking for accountability and routing.

---

## 3. Platform Hardening (MEDIUM PRIORITY)

- **Pagination standardization** — Align pagination params (page, limit, max limit) and response shape across list endpoints. Document in API surface.
- **Query/index optimization for escalation queries** — Add or tune indexes for `alert_events` escalation filters (organization_id, status, created_at, location_id). Profile and optimize raw SQL.
- **Expansion of domain event handlers** — Handlers for `checklist.run.completed`, `alert.acknowledged`, `alert.resolved`. Extend to temperature, IoT, or other alert sources as needed.
