# Notification Verification Checklist

Manual verification checklist for all five PassControl notification types. Use this to validate email and in-app notification UX after changes.

---

## Prerequisites

- [ ] Backend running (`npm run start:dev`)
- [ ] Frontend running (`npm run dev`)
- [ ] User with email notifications enabled in preferences
- [ ] Test user can trigger each notification type

---

## 1. ESCALATION_ASSIGNED

### Email

| Check | Expected | Pass? |
|-------|----------|------|
| Subject | `[PassControl] Escalation assigned to you` (optional: `— Checklist Name (severity)`) | |
| Title | "Escalation assigned to you" | |
| Context | "An alert has been assigned to you and needs your attention." | |
| Details | Checklist name, severity, item label when available | |
| Action link | "View alert" → `/alerts/{alertId}` or `/alerts` fallback | |
| Footer | "— PassControl" | |
| No undefined/null | No `undefined`, `null`, or empty labels in body | |

### In-app (NotificationBell)

| Check | Expected | Pass? |
|-------|----------|------|
| Main text | "Alert assigned to you: {name}" or "Alert assigned to you" | |
| Detail line | Severity • item label when present | |
| Relative timestamp | Shown (e.g. "2 min ago") | |
| Unread state | Blue dot visible for unread | |
| Click-through | Navigate to `/alerts/{sourceId}` | |

---

## 2. ESCALATION_CREATED

### Email

| Check | Expected | Pass? |
|-------|----------|------|
| Subject | `[PassControl] New escalation created` (optional: `— Checklist Name`) | |
| Title | "New escalation created" | |
| Context | "A new alert has been created and may need action." | |
| Details | Checklist name, severity, item when available | |
| Action link | "View alert" → `/alerts/{alertId}` | |
| Footer | "— PassControl" | |
| No undefined/null | No raw undefined/null | |

### In-app

| Check | Expected | Pass? |
|-------|----------|------|
| Main text | "New alert: {name}" or "New alert created" | |
| Detail line | Severity • item when present | |
| Click-through | `/alerts/{sourceId}` | |

---

## 3. ESCALATION_RESOLVED

### Email

| Check | Expected | Pass? |
|-------|----------|------|
| Subject | `[PassControl] Escalation resolved` (optional: `— Checklist Name`) | |
| Title | "Escalation resolved" | |
| Context | "An alert has been marked as resolved." | |
| Details | Checklist name when available | |
| Action link | "View alert" → `/alerts/{alertId}` | |
| Footer | "— PassControl" | |

### In-app

| Check | Expected | Pass? |
|-------|----------|------|
| Main text | "Alert resolved: {name}" or "Alert resolved" | |
| Click-through | `/alerts/{sourceId}` | |

---

## 4. CHECKLIST_DUE_SOON

### Email

| Check | Expected | Pass? |
|-------|----------|------|
| Subject | `[PassControl] Checklist due soon` (optional: `— Schedule Name`) | |
| Title | "Checklist due soon" | |
| Context | "A checklist run is coming due and may need your attention." | |
| Details | Checklist name, item, due date when available | |
| Action link | "View checklist run" → `/checklist-runs/{runId}` | |
| Footer | "— PassControl" | |

### In-app

| Check | Expected | Pass? |
|-------|----------|------|
| Main text | "Checklist due soon: {name}" or "Checklist due soon" | |
| Detail line | Severity • item • due date when present | |
| Click-through | `/checklist-runs/{sourceId}` | |

---

## 5. CHECKLIST_OVERDUE

### Email

| Check | Expected | Pass? |
|-------|----------|------|
| Subject | `[PassControl] Checklist overdue` (optional: `— Schedule Name`) | |
| Title | "Checklist overdue" | |
| Context | "A checklist run is overdue and needs completion." | |
| Details | Checklist name, item, due date when available | |
| Action link | "View checklist run" → `/checklist-runs/{runId}` | |
| Footer | "— PassControl" | |

### In-app

| Check | Expected | Pass? |
|-------|----------|------|
| Main text | "Checklist overdue: {name}" or "Checklist overdue" | |
| Detail line | Severity • item • due date when present | |
| Click-through | `/checklist-runs/{sourceId}` | |

---

## Fallback / Edge Cases

| Scenario | Expected | Pass? |
|----------|----------|------|
| Missing `sourceId` | No navigation (or list fallback); no crash | |
| Missing payload fields | Safe fallback text; no undefined/null | |
| Invalid alert/run ID format | Link to `/alerts` or `/checklist-runs` list | |
| Empty payload | "Notification" / generic copy | |

---

## Summary

- [ ] All 5 notification types verified (email + in-app)
- [ ] ALERT_EVENT → `/alerts/:id`
- [ ] CHECKLIST_RUN → `/checklist-runs/:id`
- [ ] No undefined/null in output
- [ ] Fallbacks behave safely
