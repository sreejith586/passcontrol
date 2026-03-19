# Next Steps

**Review and update after each implementation session.**

---

## 1. Phase 8 Alert Operations (8A COMPLETE)

- ~~**Phase 8A — Alert List Power Features**~~ — *Done.* Bulk acknowledge, bulk resolve, richer filters (severity, sourceType, from, to, assignedUserId), row selection, collapsible advanced filters.
- ~~**Alert list date filter fix**~~ — *Done.* Date-only `to` now includes full UTC day; backend repository fix.
- **Phase 8B (recommended):** Escalations filter parity (assignedToMe, unassignedOnly, assignedUserId, etc.); Comments UI RESOLUTION_NOTE support.

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
- ~~**Evidence visibility**~~ — *Done.* Read-only evidence panel; clickable "Evidence attached (N)" badge; optional delete when attachment.delete; GET /checklist-run-items/:id, DELETE /attachments/:id; no upload (backend has no multipart receive).
- **Remaining gaps:** Attachment upload (requires backend multipart or presigned URL; init-upload returns mock metadata only).

---

## 4. Platform Hardening (MEDIUM PRIORITY)

- **Pagination standardization** — Align pagination params (page, limit, max limit) and response shape across list endpoints. Document in API surface.
- **Query/index optimization for escalation queries** — Add or tune indexes for `alert_events` escalation filters (organization_id, status, created_at, location_id). Profile and optimize raw SQL.
- **Expansion of domain event handlers** — Handlers for `checklist.run.completed`, `alert.acknowledged`, `alert.resolved`. Extend to temperature, IoT, or other alert sources as needed.

---

## 5. Future Enhancements (LOWER PRIORITY)

- **Email delivery for invites** — Send setup link via email instead of manual copy; requires email service integration.
- **Password reset** — Forgot-password flow for existing users with password.
- **Edit user profile** — Name, email update; delete user.
