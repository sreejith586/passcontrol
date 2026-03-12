# Status Transition Rules – Incidents & Tasks

---

## 1. Incident status transitions

| From        | Allowed to                    | Typical trigger / note                    |
|------------|--------------------------------|-------------------------------------------|
| **OPEN**   | ACKNOWLEDGED, IN_PROGRESS, CLOSED | First response; or skip to in progress / close |
| **ACKNOWLEDGED** | IN_PROGRESS, RESOLVED, CLOSED | Work started; or resolve/close             |
| **IN_PROGRESS**  | RESOLVED, CLOSED           | Issue fixed; or close without resolve     |
| **RESOLVED**     | CLOSED                     | Manager/admin closes after verification   |
| **CLOSED**       | — (terminal)               | No further transitions                    |

- **OPEN**: Incident just created.
- **ACKNOWLEDGED**: Someone (e.g. supervisor) has seen it (e.g. `POST .../acknowledge`).
- **IN_PROGRESS**: Actions in progress.
- **RESOLVED**: Fix applied (e.g. `POST .../resolve`); may require resolution summary.
- **CLOSED**: Final state (e.g. `POST .../close`).

Validation: service layer rejects any transition not in the “Allowed to” column for the current status.

---

## 2. Task status transitions

| From        | Allowed to                    | Typical trigger / note                    |
|------------|--------------------------------|-------------------------------------------|
| **OPEN**   | IN_PROGRESS, COMPLETED, CLOSED | Start work; or complete/close directly    |
| **IN_PROGRESS** | COMPLETED, CLOSED          | Work done; or close without completing    |
| **COMPLETED**   | CLOSED                     | Manager/admin closes after verification   |
| **CLOSED**      | — (terminal)               | No further transitions                    |

- **OPEN**: Task created, not yet started.
- **IN_PROGRESS**: Assignee has started (e.g. `POST .../start`).
- **COMPLETED**: Work done (e.g. `POST .../complete`).
- **CLOSED**: Final state (e.g. `POST .../close`).

Validation: service layer rejects any transition not in the “Allowed to” column.

---

## 3. Implementation reference

**Incident allowed transitions (code):**

```ts
OPEN       → [ACKNOWLEDGED, IN_PROGRESS, CLOSED]
ACKNOWLEDGED → [IN_PROGRESS, RESOLVED, CLOSED]
IN_PROGRESS  → [RESOLVED, CLOSED]
RESOLVED    → [CLOSED]
CLOSED      → []
```

**Task allowed transitions (code):**

```ts
OPEN        → [IN_PROGRESS, COMPLETED, CLOSED]
IN_PROGRESS → [COMPLETED, CLOSED]
COMPLETED   → [CLOSED]
CLOSED      → []
```

Use these in `IncidentStatusService` and `TaskStatusService` to validate before updating status.
