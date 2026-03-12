# Permission Matrix – Incidents & Tasks

All access is **organization-scoped**; RBAC may further restrict by brand/location/zone per role assignment.

---

## 1. Incident permissions

| Permission code              | Description                          | Org Admin | Location Manager | Kitchen Supervisor | Kitchen Staff |
|-----------------------------|--------------------------------------|-----------|------------------|---------------------|---------------|
| `incident.create`           | Create incident (manual or linked)   | ✓         | ✓                | ✓                   | ✓ (own scope) |
| `incident.view`             | View incident list and details       | ✓         | ✓                | ✓                   | ✓ (own scope) |
| `incident.update`           | Update fields, acknowledge            | ✓         | ✓                | ✓                   | —             |
| `incident.resolve`          | Resolve / close incident             | ✓         | ✓                | ✓                   | —             |
| `incident.comment.create`   | Add comment to incident              | ✓         | ✓                | ✓                   | ✓ (own scope) |

- **Own scope**: Staff can create/view/comment only for locations (and zones) they are assigned to.
- **Org Admin**: Full access across all brands/locations in the organization.
- **Location Manager**: Full access within assigned location(s).
- **Kitchen Supervisor**: Full access within assigned location(s); typically has resolve/close.
- **Kitchen Staff**: Create and view incidents in assigned scope; comment allowed; no resolve/close.

---

## 2. Task permissions

| Permission code     | Description                          | Org Admin | Location Manager | Kitchen Supervisor | Kitchen Staff |
|---------------------|--------------------------------------|-----------|------------------|---------------------|---------------|
| `task.create`       | Create task (manual or from incident)| ✓         | ✓                | ✓                   | —             |
| `task.view`         | View task list and details           | ✓         | ✓                | ✓                   | ✓ (assigned)  |
| `task.update`       | Update task fields                   | ✓         | ✓                | ✓                   | —             |
| `task.assign`       | Assign / reassign task               | ✓         | ✓                | ✓                   | —             |
| `task.complete`     | Mark task complete                   | ✓         | ✓                | ✓                   | ✓ (assigned)  |
| `task.close`        | Close task                           | ✓         | ✓                | ✓                   | —             |

- **Assigned**: Staff can view and complete tasks where `assignedToId` is their user ID (or their team, if supported).
- **Org Admin / Location Manager / Kitchen Supervisor**: Create, assign, update, complete, close within their scope.
- **Kitchen Staff**: No create/assign/update/close; can complete tasks assigned to them.

---

## 3. Module & entitlement checks

- **Module**: `CORE_OPS` must be active for the organization (ModuleGuard).
- **Entitlement**: Feature keys such as `INCIDENTS` and `TASKS` must be enabled (EntitlementGuard).
- Access is **denied** if the user lacks the required permission **or** if the module/entitlement is inactive.

---

## 4. Role → permission mapping (reference)

| Role                | Incidents                             | Tasks                                      |
|---------------------|----------------------------------------|--------------------------------------------|
| Org Admin           | create, view, update, resolve, comment | create, view, update, assign, complete, close |
| Location Manager    | create, view, update, resolve, comment | create, view, update, assign, complete, close |
| Kitchen Supervisor  | create, view, update, resolve, comment | create, view, update, assign, complete, close |
| Kitchen Staff       | create, view, comment (scope-limited) | view (assigned), complete (assigned)       |
