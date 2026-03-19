# Checkpoint 2025-03-19 (Onboarding)

**Date:** 2025-03-19  
**Session focus:** Password setup flow, admin user management, PassControl branding

## Completed

- [x] Password setup flow (backend): PasswordSetupToken model, validate-setup-token, set-password endpoints; invite returns setupToken when passwordHash is null
- [x] Password setup flow (frontend): SetPasswordPage, /set-password route, AddUserModal setup link UI
- [x] Admin user management: Edit roles modal, activate/deactivate with ConfirmActionModal; user.manage permission
- [x] PassControl branding: header, sidebar, login page, set-password page, document title, index.html

## Files Changed

| File | Change |
|------|--------|
| prisma/schema.prisma | PasswordSetupToken model |
| prisma/migrations/* | password_setup_tokens table |
| src/auth/repositories/password-setup-token.repository.ts | Token create, invalidate, findByTokenHash, markUsed |
| src/auth/auth.service.ts | validateSetupToken, setPassword; PASSWORD_SETUP_SUCCESS/FAILED audit |
| src/auth/auth.controller.ts | POST validate-setup-token, set-password |
| src/users/services/users.service.ts | Invite returns setupToken when passwordHash null; invalidate prior tokens |
| src/users/users.module.ts | Import AuthModule for PasswordSetupTokenRepository |
| frontend/src/features/auth/api.ts | validateSetupToken, setPassword |
| frontend/src/features/auth/SetPasswordPage.tsx | New: token validation, password form, error state |
| frontend/src/features/auth/LoginPage.tsx | Success banner, PassControl, document title |
| frontend/src/features/users/api.ts | setupToken on UserForAssignment; addUserRole, removeUserRole, updateUserStatus |
| frontend/src/features/users/components/AddUserModal.tsx | Setup link UI when setupToken returned |
| frontend/src/features/users/components/EditRolesModal.tsx | New: role checkboxes, delta add/remove |
| frontend/src/features/users/UsersPage.tsx | Status column, actions (Edit roles, Activate/Deactivate) |
| frontend/src/features/shell/* | PassControl branding |
| frontend/index.html | Title PassControl |
| docs/ai/* | 02-current-progress, 05-api-surface, 06-decisions-log, 07-next-steps |

## Decisions Made

- Password setup token: SHA-256 hash, 7-day expiry, single-use; no email delivery yet; admin copies link.
- User status: global (User.isActive), not per-organization; wording reflects account activation, not org membership.

## Blockers / Open Questions

- None

## Next Session

1. Pagination standardization
2. Query/index optimization for escalation queries
3. Email delivery for invites (when ready)

## Context Snapshot

- Current progress: Full invite → set password → login flow complete; admin user management (edit roles, activate/deactivate); PassControl branding applied.
- Next steps doc: Updated (onboarding marked complete; future enhancements listed).
