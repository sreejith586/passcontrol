Rewrite docs/ai/07-next-steps.md completely based on current system state.

Context
The system now includes:
- checklist run engine
- alert lifecycle (create, acknowledge, resolve)
- SLA policy system (DB-driven with resolver and preview)
- escalation detection and reporting
- summary and trends endpoints for failures and alerts

Remove all outdated or completed items (e.g. tie-breakers, basic summaries).

Structure the next steps into 3 sections:

1. Advanced Operational Intelligence (HIGH PRIORITY)
Include:
- Escalation summary by severity
- Escalation trends (time-based)
- SLA compliance metrics (breached vs within SLA)

2. Supervisor / Action Layer (HIGH PRIORITY)
Include:
- Bulk acknowledge / resolve alerts
- Prioritized escalation retrieval (top N by severity and breach duration)
- Optional future: alert assignment / ownership

3. Platform Hardening (MEDIUM PRIORITY)
Include:
- Pagination standardization
- Query/index optimization for escalation queries
- Expansion of domain event handlers for new alert sources

Each item must:
- be actionable
- reflect real gaps in current system
- not duplicate already implemented features

Do not include anything already completed.

Keep it concise and structured.