# Frontend Implementation Plan

> Production-grade, implementation-ready blueprint for the operational intelligence platform UI.

**Last updated:** 2025-03-19 (revised)

---

## 1. Recommended Stack

| Category | Choice | Version | Purpose |
|----------|--------|---------|---------|
| **Runtime** | Node 20+ | LTS | Build & dev |
| **Framework** | React | 18.x | UI |
| **Build** | Vite | 5.x | Dev server, HMR, production build |
| **Language** | TypeScript | 5.x | Strict mode |
| **Routing** | React Router | 6.x | Nested routes, loaders, search params |
| **Data fetching** | TanStack Query | 5.x | Server state, caching, mutations |
| **Forms** | React Hook Form | 7.x | Form state, validation |
| **Validation** | Zod | 3.x | Schema validation, API DTO alignment |
| **HTTP** | Axios | 1.x | Interceptors, auth, error handling |
| **UI primitives** | Radix UI | 1.x | Accessible, unstyled components |
| **Styling** | Tailwind CSS | 3.x | Utility-first, design tokens |
| **Icons** | Lucide React | 0.x | Consistent icon set |
| **Date/time** | date-fns | 3.x | Formatting, timezone |

**Dev tooling:** ESLint (flat config), Prettier, Vitest for unit tests.

---

## 2. Folder Structure

```
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── index.css
│   ├── vite-env.d.ts
│   │
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   │
│   ├── core/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── types.ts
│   │   │   ├── response-unwrap.ts    # Defensive response handling
│   │   │   └── errors.ts
│   │   ├── auth/
│   │   │   ├── auth-context.tsx
│   │   │   ├── auth-guard.tsx
│   │   │   ├── token-storage.ts
│   │   │   └── types.ts
│   │   └── permissions/
│   │       ├── permission-map.ts    # Route/action → permission mapping
│   │       ├── use-permission.ts
│   │       ├── PermissionGate.tsx
│   │       └── UnauthorizedFallback.tsx
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── api.ts
│   │   │   ├── LoginPage.tsx
│   │   │   └── types.ts
│   │   │
│   │   ├── shell/
│   │   │   ├── AppShell.tsx
│   │   │   ├── AppHeader.tsx
│   │   │   ├── AppSidebar.tsx
│   │   │   └── Breadcrumbs.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── api.ts
│   │   │   ├── DashboardPage.tsx
│   │   │   └── components/
│   │   │
│   │   ├── alerts/
│   │   │   ├── api.ts
│   │   │   ├── hooks/
│   │   │   ├── AlertListPage.tsx
│   │   │   ├── AlertDetailPage.tsx
│   │   │   └── components/
│   │   │
│   │   ├── escalations/
│   │   │   ├── api.ts
│   │   │   ├── EscalationsPage.tsx
│   │   │   └── components/
│   │   │
│   │   └── organization-settings/
│   │       ├── api.ts
│   │       ├── AlertWorkflowSettingsPage.tsx
│   │       └── components/
│   │
│   ├── shared/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── DataTable/            # Shared table foundation
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── DataTableColumn.tsx
│   │   │   │   ├── DataTablePagination.tsx
│   │   │   │   └── types.ts
│   │   │   ├── ActionModal/          # Workflow action modal conventions
│   │   │   │   ├── ActionModal.tsx
│   │   │   │   ├── ConfirmActionModal.tsx
│   │   │   │   └── NoteRequiredModal.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── index.ts
│   │   ├── layout/
│   │   │   ├── PageHeader.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   └── feedback/
│   │       ├── Toast.tsx
│   │       └── useToast.ts
│   │
│   └── lib/
│       ├── date.ts
│       ├── format.ts
│       └── cn.ts
│
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

---

## 3. Layout Structure: Left Sidebar + Top Header

```
┌─────────────────────────────────────────────────────────────────────────┐
│ AppHeader                                                                │
│ [Logo]                                    [User menu / Logout]           │
├──────────────┬──────────────────────────────────────────────────────────┤
│              │ Breadcrumbs (when applicable)                             │
│ AppSidebar   │ Alerts > Alert #abc-123                                  │
│              ├──────────────────────────────────────────────────────────┤
│ • Dashboard  │                                                           │
│ • Alerts     │ Page content (Outlet)                                     │
│ • Escalations│                                                           │
│ • Settings   │                                                           │
│              │                                                           │
└──────────────┴──────────────────────────────────────────────────────────┘
```

**AppShell:**
- Full-height flex layout
- `AppHeader`: fixed top, full width; logo left, user menu right
- `AppSidebar`: fixed left, full height; nav items (permission-gated)
- Main content: scrollable area with `Outlet`; breadcrumbs above content when applicable

**AppSidebar:**
- Collapsible (optional Phase 1 enhancement; can start expanded)
- Nav items: Dashboard, Alerts, Escalations, Settings
- Each item visibility gated by route permission (see §4)
- Active state based on current route

**AppHeader:**
- Logo (links to `/dashboard` or `/alerts` as home)
- Right: user name/avatar, logout
- No duplicate nav links (sidebar is primary nav)

**Page layout:**
- `PageHeader` (title, description, actions) at top of content area
- Content below

---

## 4. Permissions Strategy

### 4.1 Permission Source

- **Source:** `GET /v1/auth/me` returns `{ user, organizationId, roles, permissions: string[] }`
- **Storage:** Permissions in auth context, available after login
- **Refresh:** Re-fetch `me` on token refresh or explicit "refresh session"

### 4.2 Route → Permission Mapping

| Route | Required Permission | Fallback if Missing |
|-------|---------------------|---------------------|
| `/dashboard` | `checklist.run.view` OR `alert.view` | Redirect to first permitted route |
| `/alerts` | `alert.view` | UnauthorizedFallback |
| `/alerts/:id` | `alert.view` | UnauthorizedFallback |
| `/escalations` | `alert.view` | UnauthorizedFallback |
| `/settings/alert-workflow` | `alert.workflow-policy.view` | UnauthorizedFallback |

**Implementation:** `permission-map.ts` exports `ROUTE_PERMISSIONS: Record<string, string | string[]>` (single or any-of). Route guard checks permission before rendering.

### 4.3 Action → Permission Mapping

| Action | Required Permission |
|--------|---------------------|
| View alerts list/detail | `alert.view` |
| Acknowledge (single/bulk) | `alert.acknowledge` |
| Resolve (single/bulk) | `alert.resolve` |
| Assign / Unassign | `alert.assign` |
| Reopen | `alert.resolve` |
| Add comment | `alert.view` |
| Manage workflow policy | `alert.workflow-policy.manage` |

### 4.4 Disabled vs Hidden

| Strategy | When to Use | UX |
|----------|-------------|-----|
| **Hidden** | User lacks permission for the action; showing it would be confusing or misleading | Button/link not rendered |
| **Disabled** | User has permission but action is invalid for current state (e.g. Resolve on already-resolved alert) | Button visible, disabled, optional tooltip |

**Rules:**
- **Route visibility (sidebar):** Hide nav items for routes user cannot access
- **Action buttons:** Hide if no permission; disable if permission exists but domain state forbids (e.g. can't acknowledge RESOLVED)
- **Bulk actions:** Hide bulk bar if no permission for any bulk action; disable specific actions (e.g. bulk resolve) if no permission

### 4.5 Unauthorized Fallback

When user navigates to a route they lack permission for:
- **Option A:** Render `UnauthorizedFallback` component (message + link to dashboard or first permitted route)
- **Option B:** Redirect to `/dashboard` or first permitted route

**Recommended:** Option A — `UnauthorizedFallback` with message "You don't have permission to view this page" and CTA to go to Dashboard or Alerts. Avoids silent redirect confusion.

### 4.6 Components

- `PermissionGate`: `({ permission, fallback?, mode: 'hide' | 'disable', children })` — hides or disables children based on permission
- `usePermission(permission): boolean` — returns whether user has permission
- `UnauthorizedFallback` — full-page or inline fallback when route permission fails

---

## 5. Alert Actions: No Hard Dependency on Organization Settings

### 5.1 Principle

- **Backend is source of truth** for resolve/reopen validation (note required when org policy enabled)
- **Frontend must not block** resolve/reopen if org settings fetch fails or is slow
- **Organization settings enhance UX** but are optional for the action flow

### 5.2 Resolve Flow

1. User clicks Resolve
2. **Option A (no org settings):** Open modal with optional note field. Submit. If backend returns 400 "Resolution note required", show error, keep modal open, mark field required
3. **Option B (org settings available):** If `requireResolutionNoteOnResolve === true`, show note field as required from the start; otherwise optional
4. **Never:** Block the Resolve button or modal open on org settings fetch

### 5.3 Reopen Flow

Same pattern: optional note field by default; if backend returns 400 "Reopen note required", surface error and require note. Org settings can pre-mark required for better UX.

### 5.4 Implementation

- Resolve/Reopen modals **always** include a note field (optional by default)
- On 400 with validation message indicating note required: show inline error, optionally switch field to required
- Org settings fetch: best-effort, non-blocking. Use to show "Required" label and validation upfront when available
- No `await getOrgSettings()` before opening resolve/reopen modal

---

## 6. API Response Handling (Verified)

### 6.1 Backend Verification

**Verified** (from `src/infra/responses/api-response.ts` and controller usage):
- Success: `ApiResponse.ok(data)` → `{ success: true, data: T }`
- Created: `ApiResponse.created(data)` → `{ success: true, data: T }`
- Failure: `ApiResponse.fail(error)` → `{ success: false, error }`
- NestJS throws on 4xx/5xx; `ApiResponse.fail` used for controlled error responses

**Paginated responses:** `data` is `{ items, total, page, limit }` (confirmed from API surface doc).

### 6.2 Frontend Strategy

- **Do not assume** every endpoint returns `{ success, data }` until confirmed per endpoint
- **Response unwrap module** (`core/api/response-unwrap.ts`):
  - `unwrapResponse<T>(response: unknown): T` — if `response` has `success === true` and `data`, return `data`; otherwise throw
  - Use only for endpoints **confirmed** to use `ApiResponse.ok`/`created`
  - For unconfirmed or third-party endpoints: handle raw response, no unwrap
- **Document** which endpoints use wrapped shape in `core/api/types.ts` or a small registry
- **Axios interceptor:** Option A) Return `response.data` as-is; each API function unwraps. Option B) Interceptor unwraps only when `response.data.success === true`. Prefer Option A for explicitness.

### 6.3 Error Handling

- 401: Clear token, redirect to `/login`
- 403: Toast "You don't have permission"; do not unwrap
- 4xx with body: Parse `error` or validation messages; show in form or toast
- 5xx: Generic toast, optional retry

---

## 7. Shared Table Foundation

### 7.1 DataTable Component

A shared foundation for alert list, escalation list, and future list views.

**Location:** `shared/ui/DataTable/`

**Props:**
- `columns: DataTableColumn<T>[]` — key, header, render, sortKey?, width?
- `data: T[]`
- `loading?: boolean`
- `emptyMessage?: string`
- `selectable?: boolean` — show checkbox column
- `selectedIds?: string[]` — controlled selection
- `onSelectionChange?: (ids: string[]) => void`
- `getRowId: (row: T) => string`
- `onRowClick?: (row: T) => void` — optional navigation

**Features:**
- Header row with column headers
- Loading state: skeleton rows or spinner overlay
- Empty state: `EmptyState` component or custom message
- Selection: checkbox column when `selectable`
- Responsive: horizontal scroll on narrow viewports

### 7.2 Pagination

- `DataTablePagination`: `{ page, limit, total, onPageChange, onLimitChange }`
- Shared across alert list, escalations
- URL-synced (page, limit in search params)

### 7.3 Alert/Escalation Usage

- `AlertListPage` uses `DataTable<AlertEvent>` with columns: status, severity, location, SLA, assignee, triggered, actions
- `EscalationsPage` uses `DataTable<EscalationAlert>` with same base + breach flags
- Both share column config patterns; can extract `alertTableColumns`, `escalationTableColumns` in feature layer

---

## 8. Shared Modal/Dialog Conventions for Workflow Actions

### 8.1 ActionModal Base

**Location:** `shared/ui/ActionModal/`

**Conventions:**
- Radix Dialog as base
- Consistent structure: title, body, footer (Cancel + primary action)
- `onClose` on Cancel or overlay click
- `onConfirm` for primary action; loading state during mutation
- Escape key closes

### 8.2 ConfirmActionModal

For simple confirmations (e.g. Acknowledge):
- Title: "Acknowledge alert?"
- Body: Short description
- Footer: Cancel, Acknowledge
- No form fields

### 8.3 NoteRequiredModal (Resolve, Reopen)

For actions that may require a note:
- Title: "Resolve alert" / "Reopen alert"
- Body: Textarea for note; label "Resolution note" / "Reopen note"
- Optional hint: "Required by your organization's policy" when org settings indicate so
- Footer: Cancel, Resolve / Reopen
- Validation: Client-side optional; backend is source of truth
- On submit error (400 note required): Show inline error, keep modal open

### 8.4 AssignModal

- User picker (requires user list API — see backend gaps)
- Footer: Cancel, Assign
- If no user list: placeholder or defer to later phase

---

## 9. App Routes

```tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <AuthGuard><AppShell /></AuthGuard>,
    children: [
      { index: true, element: <Navigate to="/alerts" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'alerts', element: <AlertListPage /> },
      { path: 'alerts/:id', element: <AlertDetailPage /> },
      { path: 'escalations', element: <EscalationsPage /> },
      {
        path: 'settings',
        children: [
          { index: true, element: <Navigate to="/settings/alert-workflow" replace /> },
          { path: 'alert-workflow', element: <AlertWorkflowSettingsPage /> },
        ],
      },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
```

**Default redirect:** `/` → `/alerts` (alerts as primary workflow surface).

---

## 10. First-Phase Build Order (Alerts First)

| Step | Deliverable |
|------|-------------|
| 1 | Vite + React + TS + Tailwind scaffold |
| 2 | core/api (client, types, response-unwrap, errors) |
| 3 | core/auth (context, guard, token) |
| 4 | core/permissions (permission-map, usePermission, PermissionGate, UnauthorizedFallback) |
| 5 | **Screen 1:** LoginPage |
| 6 | features/shell (AppShell, AppHeader, **AppSidebar**) |
| 7 | shared/ui (Button, Input, Textarea, Badge, Spinner, Skeleton) |
| 8 | shared/ui/DataTable (DataTable, DataTablePagination) |
| 9 | shared/ui/ActionModal (ActionModal, ConfirmActionModal, NoteRequiredModal) |
| 10 | shared/ui/Modal (base), shared/layout (PageHeader, EmptyState) |
| 11 | features/alerts/api (list, get, acknowledge, resolve, assign, reopen, bulk, activities, comments) |
| 12 | **Screen 2:** AlertListPage (primary workflow surface) |
| 13 | **Screen 3:** AlertDetailPage (primary workflow surface) |
| 14 | **Screen 4:** EscalationsPage |
| 15 | **Screen 5:** Dashboard placeholder |
| 16 | features/organization-settings (AlertWorkflowSettingsPage) |
| 17 | Bulk actions on AlertListPage |
| 18 | Polish (error boundaries, permissions on all routes/actions) |

**Primary workflow surfaces:** Alert List and Alert Detail are built immediately after shell and shared foundations. Dashboard and Escalations follow.

---

## 11. First 5 Screens (Revised Order)

### Screen 1: Login Page
*(Unchanged — foundation)*

### Screen 2: Alert List Page
**Purpose:** Primary workflow surface. List alerts, filter, paginate, select, bulk actions.

**Components:** AlertListPage, DataTable, filters, pagination, bulk action bar.

### Screen 3: Alert Detail Page
**Purpose:** Primary workflow surface. View alert, perform actions, timeline, comments.

**Components:** AlertDetailPage, AlertHeader, AlertActionBar, ActivityTimeline, CommentsSection, ResolveModal, ReopenModal, AssignModal.

### Screen 4: Escalations Page
**Purpose:** Escalation-focused view. Same DataTable foundation, breach indicators.

### Screen 5: Dashboard (Placeholder)
**Purpose:** Overview. Can be minimal; metrics/trends added later.

---

## 12. State / Query Layer

*(Unchanged from prior plan — query keys, invalidation, URL sync.)*

---

## 13. Feature Module Boundaries

| Feature | Owns | Does NOT |
|---------|------|----------|
| **alerts** | List, detail, actions, bulk, timeline, comments | Hard-depend on org settings for action flow |
| **organization-settings** | Workflow policy form | Block or gate alert actions |

---

## 14. Environment Variables

```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## 15. TypeScript Strictness

- `strict: true`
- Shared types aligned with backend DTOs
