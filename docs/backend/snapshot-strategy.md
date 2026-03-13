# Snapshot Strategy

> Consolidated from schema and design docs. No new strategy introduced.

---

## Current Use

### ChecklistRun

- **templateNameSnapshot** – stored at run creation
- **templateVersion** – stored at run creation
- Rationale: Template can change or be versioned independently; runs must preserve what was executed

### No FKs to Templates

- `ChecklistRun` has `checklistTemplateId` but no relation to a ChecklistTemplate model
- Templates are assumed versioned elsewhere; runs capture a point-in-time copy

---

## Future Extension Points (from design docs)

- Temperature: `breachGraceSeconds` on policy – “breach only after N seconds” (evaluated at read time, not snapshotted)
- Alert payload: `payloadJson` stores event payload; no formal snapshot of source entity
- Audit: `before` / `after` JSON snapshots for write operations

---

## Principles (inferred)

- Store immutable identifiers (templateVersion, templateNameSnapshot) at creation
- Do not rely on live template content for historical runs
- Audit before/after for write ops; alert payload for event context
