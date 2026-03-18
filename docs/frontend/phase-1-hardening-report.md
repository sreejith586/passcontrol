# Phase 1 Frontend Hardening Report

**Date:** 2025-03-19

---

## 1. Issues Found

### Assignment UI
- **Issue:** Manual UUID entry presented as production-ready; misleading.
- **Fix:** Replaced with disabled `AssignPlaceholder` button ("Assign (coming soon)") with tooltip. Removed AssignModal. Unassign remains functional.

### Auth/Session
- **Issue:** Stored refresh token but never used it; backend has `POST /auth/refresh` but frontend does not call it.
- **Fix:** Access-token-only session. Removed refresh token from storage. Login stores only access token. 401 triggers re-login.
- **Bootstrap:** Removed optimistic `getStoredUser()` before `/me`; session set only after `/me` completes. Prevents permission flicker.

### API Contract
- **Verified:** Alert list params (assignedToMe, unassignedOnly, status, page, limit, sort), pagination `{ items, total, page, limit }`, detail/activities/comments, acknowledge (no body), resolve `{ resolutionNote? }`, reopen `{ note? }`, assign `{ assignedToUserId }`, unassign (no body). All match backend.
- **Added:** `core/api/contracts.md` documenting verified endpoints.

---

## 2. Files Changed

| File | Change |
|------|--------|
| `core/auth/token-storage.ts` | Removed refresh token; `setAccessToken` only |
| `core/auth/auth-context.tsx` | Use `setAccessToken`; login takes `{ accessToken, user }`; removed storedUser bootstrap |
| `features/auth/LoginPage.tsx` | Pass only `accessToken` and `user` to login |
| `features/alerts/components/AlertActionBar.tsx` | Replace Assign button + AssignModal with AssignPlaceholder; remove assign mutation |
| `features/alerts/components/AssignPlaceholder.tsx` | **New** — disabled placeholder with tooltip |
| `features/alerts/components/AssignModal.tsx` | **Deleted** |
| `core/api/contracts.md` | **New** — verified endpoint documentation |
| `features/alerts/api.ts` | Added listAlerts contract comment |

---

## 3. Exact Behavior Changes

| Before | After |
|--------|-------|
| Assign opened modal with UUID input | Assign shows disabled "Assign (coming soon)" with tooltip |
| Refresh token stored in sessionStorage | Only access token stored |
| Login passed refreshToken to auth context | Login passes only accessToken |
| Bootstrap could set user from storedUser before /me | Session set only after /me completes |
| No API contract documentation | contracts.md documents verified endpoints |

---

## 4. Remaining Backend Gaps

| Gap | Impact | Recommendation |
|-----|--------|-----------------|
| **User list for assignment** | Assign action disabled | Add `GET /users` or `GET /organization-members` (org-scoped, paginated) |
| **Refresh token unused** | Session ends on access token expiry (~15m); no silent refresh | Optional: implement refresh before expiry or on 401 |
