# Temperature Logging & Alert Events – Design Summary

## 1. Module / folder structure

```
src/
  temperature/
    temperature.module.ts
    controllers/
      temperature-policies.controller.ts
      temperature-readings.controller.ts
    services/
      temperature-policies.service.ts
      temperature-readings.service.ts
      policy-scope.service.ts
      policy-resolver.service.ts
      breach-detection.service.ts
    repositories/
      temperature-policies.repository.ts
      temperature-readings.repository.ts
    dto/
      create-temperature-policy.dto.ts
      update-temperature-policy.dto.ts
      create-temperature-reading.dto.ts
      list-temperature-policies.dto.ts
      list-temperature-readings.dto.ts
    enums/
      source-type.enum.ts
      breach-type.enum.ts

  alert-events/
    alert-events.module.ts
    controllers/
      alert-events.controller.ts
    services/
      alert-events.service.ts
    repositories/
      alert-events.repository.ts
    dto/
      list-alert-events.dto.ts
    enums/
      alert-type.enum.ts
      alert-status.enum.ts
```

- **TemperatureModule** imports InfraModule, AccessModule, AuditModule, **AlertEventsModule** (to create alerts on breach).
- **AlertEventsModule** imports only InfraModule, AccessModule, AuditModule (no dependency on TemperatureModule).

---

## 2. Policy resolution strategy

- **Goal:** For a given reading (location, zone, asset), choose a single policy to evaluate breach.
- **Precedence (first match wins):**
  1. **Asset-level** – policy with `assetId` matching the reading’s asset.
  2. **Zone-level** – policy with `zoneId` matching the reading’s zone (and no asset).
  3. **Location-level** – policy with `locationId` matching the reading’s location (and no zone/asset).
  4. **Brand/org-level** – policy with only `brandId` or org-wide (no location/zone/asset).
- **Implementation:** `PolicyResolverService.resolvePolicy(organizationId, scope)` loads all active policies that match the scope (by asset/zone/location/brand) and picks the most specific in the order above.
- **Explicit policy:** If the client sends `policyId` on the reading, that policy is used for evaluation and resolution is skipped.

---

## 3. Breach evaluation strategy

- **Inputs:** `readingValue`, `unit`, policy `minTemp`, `maxTemp`, `policyUnit`.
- **Rules:**
  - If `unit !== policyUnit` → no breach (no unit conversion in MVP).
  - If `readingValue < minTemp` → breach, `breachType = LOW`.
  - If `readingValue > maxTemp` → breach, `breachType = HIGH`.
  - Else → no breach, `breachType = NONE`.
- **Deterministic:** No grace period logic in MVP; `breachGraceSeconds` is stored on the policy for future use (e.g. “breach only after X seconds”).

---

## 4. Alert lifecycle summary

- **Creation:** Alert events are created by **other services** (e.g. `TemperatureReadingsService` when `isBreach === true`) via `AlertEventsService.createFromPayload(...)`. No public `POST /alert-events` for arbitrary creation in MVP.
- **States:** OPEN → ACKNOWLEDGED → RESOLVED.
- **Acknowledge:** Only OPEN alerts can be acknowledged; sets `acknowledgedAt` and status to ACKNOWLEDGED.
- **Resolve:** Any non-resolved alert can be resolved; sets `resolvedAt` and status to RESOLVED.
- **Separation:** Alert events are **separate** from incidents and tasks; they are an event log with light state. Future automation may create incidents/tasks from alerts.

---

## 5. Checklist response linkage

- **Temperature readings** may optionally include `checklistRunId` and `checklistRunResponseId` for traceability when the reading is captured as part of a checklist run.
- **Validation:** `PolicyScopeService.validateReadingScope` ensures that if provided, the run and response belong to the same organization and that the run’s location matches the reading’s location.
- **No auto-creation:** Checklist run execution does not automatically create temperature readings; the client (or a future integration) submits a reading with optional checklist IDs.

---

## 6. Access control (summary)

- **Policies:** `temperature.policy.create`, `temperature.policy.view`, `temperature.policy.update` (managers/admins).
- **Readings:** `temperature.reading.create` (e.g. kitchen staff in scope), `temperature.reading.view` (supervisors/managers).
- **Alerts:** `alert.view`, `alert.acknowledge`, `alert.resolve` (supervisors/managers).
- All access is organization-scoped; RBAC and optional module/entitlement guards apply.

---

## 7. Intentionally deferred to later

- **Sensor registry** and device management.
- **Sensor ingestion** (polling, webhooks) – schema supports `sourceType: SENSOR`; no adapter logic in MVP.
- **Advanced alert routing**, suppression, escalation engines.
- **Automatic incident/task creation** from alert events or checklist failures.
- **Unit conversion** (e.g. °F ↔ °C) in breach evaluation.
- **Breach grace period** (breach only after N seconds out of range).
- **Dashboard metrics** and SLA breach alerts.
