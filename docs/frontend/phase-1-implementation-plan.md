# Phase 1 Implementation Plan

**Source of truth:** `docs/frontend/implementation-plan.md`

---

## 1. Auth/Session Decision

**Storage:** `sessionStorage` for `accessToken` and `refreshToken`.

**Rationale:**
- Persists across tab refresh (user stays logged in)
- Clears when tab/browser closes (reasonable for enterprise ops)
- Avoids localStorage XSS exposure
- Backend returns both tokens; we store both for future refresh flow

**Flow:**
- Login: store tokens + user in sessionStorage; set auth context
- On app load: if token exists, fetch `/me` to get user + permissions; set auth context
- 401 on any request: clear tokens, redirect to `/login`
- Logout: clear sessionStorage, clear context, redirect to `/login`
- Refresh token: Phase 1 skips auto-refresh; 401 triggers re-login

---

## 2. User List API Availability

**Status:** No user list API exists. Grep found no `/users`, `/organization-members`, or `/members` endpoints.

**Approach:** Scaffold integration point. `features/alerts/api.ts` exports `listUsersForAssignment(): Promise<UserForAssignment[]>` that throws with clear message "User list API not yet available". AssignModal renders a placeholder UI: "Assign to user" with disabled/placeholder state and comment: "Requires GET /users or /organization-members endpoint."

---

## 3. Phase 1 File Tree

```
frontend/
├── public/favicon.svg
├── src/
│   ├── main.tsx
│   ├── index.css
│   ├── vite-env.d.ts
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── core/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── types.ts
│   │   │   ├── response-unwrap.ts
│   │   │   └── errors.ts
│   │   ├── auth/
│   │   │   ├── auth-context.tsx
│   │   │   ├── auth-guard.tsx
│   │   │   ├── token-storage.ts
│   │   │   └── types.ts
│   │   └── permissions/
│   │       ├── permission-map.ts
│   │       ├── use-permission.ts
│   │       ├── PermissionGate.tsx
│   │       └── UnauthorizedFallback.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── api.ts
│   │   │   ├── LoginPage.tsx
│   │   │   └── types.ts
│   │   ├── shell/
│   │   │   ├── AppShell.tsx
│   │   │   ├── AppHeader.tsx
│   │   │   └── AppSidebar.tsx
│   │   └── alerts/
│   │       ├── api.ts
│   │       ├── types.ts
│   │       ├── query-keys.ts
│   │       ├── AlertListPage.tsx
│   │       ├── AlertDetailPage.tsx
│   │       └── components/
│   │           ├── AlertHeader.tsx
│   │           ├── AlertActionBar.tsx
│   │           ├── ActivityTimeline.tsx
│   │           ├── CommentsSection.tsx
│   │           ├── ResolveModal.tsx
│   │           ├── ReopenModal.tsx
│   │           └── AssignModal.tsx
│   ├── shared/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── DataTable/
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── DataTablePagination.tsx
│   │   │   │   └── types.ts
│   │   │   ├── ActionModal/
│   │   │   │   ├── ActionModal.tsx
│   │   │   │   ├── ConfirmActionModal.tsx
│   │   │   │   └── NoteRequiredModal.tsx
│   │   │   └── index.ts
│   │   ├── layout/
│   │   │   ├── PageHeader.tsx
│   │   │   └── EmptyState.tsx
│   │   └── feedback/
│   │       └── useToast.ts (simple implementation)
│   └── lib/
│       ├── cn.ts
│       └── date.ts
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── eslint.config.js
```

---

## 4. Build Order

| # | Deliverable |
|---|-------------|
| 1 | Vite + React + TS + Tailwind scaffold (package.json, configs, index.html) |
| 2 | lib/cn.ts |
| 3 | core/api (types, errors, response-unwrap, client) |
| 4 | core/auth (token-storage, types, auth-context, auth-guard) |
| 5 | core/permissions (permission-map, use-permission, PermissionGate, UnauthorizedFallback) |
| 6 | features/auth (api, types, LoginPage) |
| 7 | app (providers, router, App.tsx), main.tsx, index.css |
| 8 | features/shell (AppShell, AppHeader, AppSidebar) |
| 9 | shared/ui (Button, Input, Textarea, Badge, Spinner, Skeleton, Modal) |
| 10 | shared/ui/DataTable |
| 11 | shared/ui/ActionModal |
| 12 | shared/layout (PageHeader, EmptyState) |
| 13 | shared/feedback (useToast) |
| 14 | features/alerts (api, types, query-keys) |
| 15 | AlertListPage |
| 16 | AlertDetailPage + components (Header, ActionBar, Timeline, Comments, Modals) |
