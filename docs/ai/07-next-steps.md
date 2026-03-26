# Next Steps

**Review and update after each implementation session.** Last pass: 2026-03-24.

---

## 1. Phase 8 Alert Operations (historical — complete)

- ~~**Phase 8A — Alert List Power Features**~~ — *Done.* Bulk acknowledge, bulk resolve, richer filters (severity, sourceType, from, to, assignedUserId), row selection, collapsible advanced filters.
- ~~**Alert list date filter fix**~~ — *Done.* Date-only `to` now includes full UTC day; backend repository fix.
- ~~**Phase 8B — Escalations filter parity**~~ — *Done.* Richer filters (severity, assignedToMe, unassignedOnly, assignedUserId); URL-synced state; assignment precedence.
- ~~**Phase 8C — Resolution note workflow**~~ — *Done.* Comments UI supports COMMENT and RESOLUTION_NOTE; type badges; resolve/reopen note-required errors surfaced inline.

---

## 2. End-to-End User Journey (COMPLETE)

- ~~**Password setup flow**~~ — *Done.* Invite → setupToken → /set-password → login. Backend: PasswordSetupToken, validate-setup-token, set-password. Frontend: SetPasswordPage, AddUserModal setup link.
- ~~**Admin user management**~~ — *Done.* Edit roles, activate/deactivate; user.manage permission; global account status wording.
- ~~**PassControl branding**~~ — *Done.* Header, sidebar, login, set-password, document title.

---

## 2. Phase 7 Checklist Execution UI (core implemented, enhancements pending)

- ~~**Checklist Runs list**~~ — *Done.* Route /checklist-runs, Today/Overdue/Failed tabs; GET /checklist-runs/today, /overdue, /failed; checklist name, due time, status, progress; row click → detail.
- ~~**Run detail / execution**~~ — *Done.* GET /checklist-runs/:id; template name, run number, status, due time, sections, items; required items highlighted.
- ~~**Item inputs**~~ — *Done.* BOOLEAN, TEXT, TEMPERATURE, CHECKBOX; Pass/Fail for BOOLEAN/CHECKBOX; save on blur for TEXT/TEMPERATURE; PATCH /checklist-run-items/:id.
- ~~**Failure/compliance UX**~~ — *Done.* Comment field when requires comment on fail; evidence requirement surfaced; attachment count reflected when available.
- ~~**Submit flow**~~ — *Done.* POST /checklist-runs/:id/submit; validation errors surfaced; success toast and navigate to list.
- ~~**Production hardening**~~ — *Done.* Failed tab; mutation safety (submit disabled during item updates); redundant PATCH prevention; race-condition handling; visible saving state; unsupported item types shown clearly.
- ~~**Evidence visibility**~~ — *Done.* Read-only evidence panel; clickable "Evidence attached (N)" badge; optional delete when attachment.delete; GET /checklist-run-items/:id, DELETE /attachments/:id.
- ~~**Phase 9A — Evidence upload**~~ — *Done.* Upload control in EvidencePanel; POST /checklist-run-items/:id/evidence; permission-gated (checklist.run.update); single-file; JPEG/PNG/WebP/GIF; max 50 MB; success/error toasts; query invalidation.

---

## 3. Phase 13 First Customer Experience (13B.1 COMPLETE)

- ~~**Phase 13B.1 — Guided First Value onboarding**~~ — *Done.* Default landing /dashboard; Get Started panel when no runs; quick-setup endpoint creates template+schedule+run; Start setup CTAs; improved empty states; product explanation.
- **Phase 13B.2+** — Optional: onboarding for orgs with template/schedule but no runs; smart landing (Dashboard vs Alerts based on context).
- ~~**Phase 14A — Checklist Template Management**~~ — *Done.* List page, create/edit page, sections and items editor, Save, Publish.

---

## 4. Phase 15 Ownership & Visibility (15D COMPLETE)

- ~~**Phase 15D — Run Performer Visibility**~~ — *Done.* performedByUser relation; RUN_INCLUDE/RUN_SUMMARY_SELECT; Performed By in run detail and list; read-only, null-safe.
- ~~**Phase 15E — My Runs / Assignee-Based Filtering**~~ — *Done.* assignedToMe, assignedToUserId on today/overdue/failed; "Assigned to me" checkbox; URL-synced; no assignee dropdown.

---

## 5. Platform Hardening (MEDIUM PRIORITY)

- **Pagination standardization** — Align pagination params (page, limit, max limit) and response shape across list endpoints (docs: `docs/ai/05-api-surface.md`).
- **Query/index optimization for escalation queries** — Add or tune indexes for `alert_events` escalation filters (organization_id, status, created_at, location_id). Profile and optimize raw SQL.
- **Expansion of domain event handlers** — Handlers for `checklist.run.completed`, `alert.acknowledged`, `alert.resolved`. Extend to temperature, IoT, or other alert sources as needed.
- **Production analytics validation** — Confirm GA4/PostHog env vars in deploy pipeline; verify SPA page views and key events in staging/prod; document measurement IDs per environment.

---

## 6. Future Enhancements (LOWER PRIORITY)

- **Email delivery for invites** — Send setup link via email instead of manual copy; requires email service integration.
- **Password reset** — Forgot-password flow for existing users with password.
- **Edit user profile** — Name, email update; delete user.
