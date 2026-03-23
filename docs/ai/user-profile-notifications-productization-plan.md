# PassControl: User Profile, Security, Preferences & Multi-Channel Notifications

## Executive Summary

This plan extends PassControl from in-app notifications into a productized layer for user profile, security, notification preferences, and multi-channel delivery (email first, WhatsApp-ready). It preserves the current architecture and minimizes disruption while enabling future channel expansion.

---

## 1. Architecture Audit & Integration Points

### 1.1 Current State Summary

| Area | Current State | Integration Point |
|------|---------------|-------------------|
| **Auth** | JWT access/refresh; login validates email+password against `User.passwordHash`; first `UserRoleAssignment` defines org; no logout server-side | Add `POST /auth/forgot-password`, `POST /auth/reset-password`; extend `AuthService` for password change when authenticated |
| **Users** | `User`: id, email, name, passwordHash, isActive; no phone/jobTitle; list/invite/roles/status APIs; org-scoped via `UserRoleAssignment` | Add `PATCH /users/me` (self-profile); extend User model with phoneNumber, jobTitle, passwordUpdatedAt |
| **Password setup** | `PasswordSetupToken` for invite flow; `validate-setup-token`, `set-password`; token in API response (not emailed) | Reuse token pattern for reset; add `password_reset_tokens` with distinct lifecycle |
| **Notifications** | In-app only; `Notification` table; `NotificationsService.createNotification` inserts rows; cron for CHECKLIST_DUE_SOON/OVERDUE | Add `NotificationDeliveryService` as facade; existing `createNotification` remains single source of truth; delivery layer decides channels from preferences |
| **Org settings** | `Organization` settings (timezone, temp unit, workflow policy); no user-level preferences | Add `user_notification_preferences` per user per org |
| **Frontend** | Settings under `/settings/*` (organization, users, roles); no profile/security/preferences pages; header user dropdown has logout only | Add `/settings/profile`, `/settings/security`, `/settings/notifications`; wire user menu to profile |

### 1.2 Cleanest Integration Points

1. **Profile**: New `PATCH /users/me` authenticated endpoint (no admin permission); uses existing `UsersService` / `UsersRepository` with `userId` from JWT.
2. **Password change**: New `POST /auth/change-password`; requires current password; reuses `AuthService.hashPassword` and Prisma `User` update.
3. **Password reset**: New `password_reset_tokens` table; `POST /auth/forgot-password` creates token, sends email (when email channel exists); `POST /auth/reset-password` consumes token.
4. **Notification preferences**: New `UserNotificationPreferences` model; `GET/PATCH /users/me/notification-preferences`; read by delivery layer when deciding channels.
5. **Multi-channel delivery**: New `NotificationDeliveryService` invoked after `createNotification` (or via small hook); checks preferences, enqueues/sends per channel; `notification_deliveries` for audit and idempotency.

---

## 2. Data Model Recommendations

### 2.1 User Model Extensions

```prisma
model User {
  // existing
  id           String    @id @default(uuid()) @db.Uuid
  email        String    @unique
  name         String
  passwordHash String?   @map("password_hash")
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz

  // NEW (V1)
  phoneNumber      String?   @map("phone_number")  // E.164 or normalized; nullable for gradual rollout
  passwordUpdatedAt DateTime? @map("password_updated_at") @db.Timestamptz  // security tracking

  // NEW (V1.5)
  jobTitle        String?   @map("job_title")  // optional profile field

  // relations unchanged
}
```

**Validation rules**: email unique, phoneNumber E.164 format if present, name non-empty.

**Indexes**: existing `email` unique; optional `phoneNumber` index if used for lookups.

### 2.2 password_reset_tokens

```prisma
model PasswordResetToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  tokenHash String    @map("token_hash")  // hashed, never stored plain
  expiresAt DateTime  @map("expires_at") @db.Timestamptz
  usedAt    DateTime? @map("used_at") @db.Timestamptz
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tokenHash])
  @@index([userId])
  @@index([expiresAt])
  @@map("password_reset_tokens")
}
```

**Lifecycle**: Create on forgot-password; 1h expiry; single use (usedAt set on reset). Token sent in email link (plain token, hashed in DB).

### 2.3 user_notification_preferences

```prisma
model UserNotificationPreference {
  id             String   @id @default(uuid()) @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  organizationId String   @map("organization_id") @db.Uuid

  // Channel toggles (defaults: inApp=true, email=true for critical, whatsapp=false)
  inAppEnabled      Boolean @default(true) @map("in_app_enabled")
  emailEnabled      Boolean @default(true) @map("email_enabled")
  whatsAppEnabled   Boolean @default(false) @map("whatsapp_enabled")

  // Optional: per-event-type overrides (V1.5)
  // For V1: global toggles only
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user         User         @relation(...)
  organization Organization @relation(...)

  @@unique([userId, organizationId])
  @@index([userId])
  @@index([organizationId])
  @@map("user_notification_preferences")
}
```

**Scoping**: Preferences are per user per org (matches notification scoping).

### 2.4 notification_deliveries (optional, recommended for V1 email)

```prisma
model NotificationDelivery {
  id             String   @id @default(uuid()) @db.Uuid
  notificationId String   @map("notification_id") @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  channel        String   // 'in_app' | 'email' | 'whatsapp'
  status         String   // 'pending' | 'sent' | 'failed'
  sentAt         DateTime? @map("sent_at") @db.Timestamptz
  errorMessage   String?  @map("error_message")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz

  notification Notification @relation(...)
  user         User         @relation(...)

  @@unique([notificationId, userId, channel])  // idempotency
  @@index([userId, channel, createdAt])
  @@map("notification_deliveries")
}
```

**Purpose**: Audit trail, idempotency (avoid duplicate emails), retry tracking. In-app "delivery" can be implicit (notification row exists) or explicit row for consistency.

---

## 3. Channel Strategy

### 3.1 What Stays In-App

- All notification types remain stored in `Notification` table.
- Bell dropdown, unread count, mark-read continue as primary UX.
- No change to existing `createNotification` call sites for persistence.

### 3.2 What Also Goes to Email (V1)

| Notification Type | In-App | Email (V1) | Rationale |
|-------------------|--------|------------|-----------|
| ESCALATION_ASSIGNED | ✓ | ✓ | High urgency; assignee should know immediately |
| ESCALATION_CREATED | ✓ | ✓ | New alert; watchers need visibility |
| ESCALATION_RESOLVED | ✓ | ✓ | Assignee/watchers closure |
| CHECKLIST_DUE_SOON | ✓ | ✓ | Reminder; assignee may be away |
| CHECKLIST_OVERDUE | ✓ | ✓ | Urgent; needs attention |

**Default**: `emailEnabled=true` for new users; user can opt out in preferences.

### 3.3 What Later Goes to WhatsApp (Staged)

- Same notification types as email, initially.
- `whatsAppEnabled` default `false`; opt-in only.
- Requires `User.phoneNumber` validated and WhatsApp Business API integration.
- **Deferred**: No WhatsApp provider code in V1; only schema and preference flag.

### 3.4 Safe Defaults

- **inAppEnabled**: `true` (always; cannot disable in-app)
- **emailEnabled**: `true` (user can disable)
- **whatsAppEnabled**: `false` (user opts in when available)

---

## 4. API Contract

### 4.1 Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/users/me` | JWT | Current user profile (id, email, name, phoneNumber, jobTitle, passwordUpdatedAt) |
| PATCH | `/v1/users/me` | JWT | Update name, phoneNumber, jobTitle; email change requires verification (V1.5) |

### 4.2 Security

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/auth/change-password` | JWT | Body: `{ currentPassword, newPassword }` |
| POST | `/v1/auth/forgot-password` | None | Body: `{ email }`; 204 always (no user enumeration) |
| POST | `/v1/auth/reset-password` | None | Body: `{ token, newPassword }`; consumes token |

### 4.3 Notification Preferences

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/users/me/notification-preferences` | JWT | Preferences for current user in current org |
| PATCH | `/v1/users/me/notification-preferences` | JWT | Update inAppEnabled, emailEnabled, whatsAppEnabled |

**Response shape** (preferences):

```json
{
  "inAppEnabled": true,
  "emailEnabled": true,
  "whatsAppEnabled": false
}
```

---

## 5. Frontend Plan

### 5.1 New Routes

| Path | Component | Permission |
|------|-----------|------------|
| `/settings/profile` | ProfilePage | Authenticated (any) |
| `/settings/security` | SecurityPage | Authenticated (any) |
| `/settings/notifications` | NotificationPreferencesPage | Authenticated (any) |
| `/reset-password` | ResetPasswordPage | Public (token in query) |

### 5.2 My Profile

- Display: name, email (read-only initially), phone (optional), job title (optional).
- Edit: PATCH /users/me for name, phone, jobTitle.
- Layout: Card-based, aligned with existing Organization Settings pages.

### 5.3 Security

- **Change password**: Form with currentPassword, newPassword, confirm; POST /auth/change-password.
- **Forgot password** (when not logged in): Link on login page → `/forgot-password` → form with email → POST /auth/forgot-password; show "If an account exists, you’ll receive an email" (no enumeration).
- **Reset password**: `/reset-password?token=...` → form with newPassword → POST /auth/reset-password; redirect to login on success.

### 5.4 Notification Preferences

- Toggles: In-app (disabled state), Email (toggle), WhatsApp (toggle, disabled with tooltip "Coming soon" in V1).
- Helper text: "Control how you receive notifications. In-app notifications always appear in the bell."
- Persist on toggle: PATCH /users/me/notification-preferences.

### 5.5 Navigation

- Add "My Profile" under Settings in sidebar (or user dropdown: "Profile", "Security", "Notification preferences").
- Breadcrumbs: Settings → Profile / Security / Notifications.

---

## 6. Multi-Channel Delivery Architecture

### 6.1 Flow

```
createNotification(orgId, { type, userIds, sourceType, sourceId, payload, dedupeKey })
  → NotificationsService (unchanged): inserts Notification rows per userId
  → NotificationDeliveryService.deliver(notificationIds) [NEW]
      → For each (notificationId, userId):
          1. Load UserNotificationPreference (defaults if missing)
          2. In-app: already done (row exists)
          3. Email: if emailEnabled && User.email → enqueue/send (MailService)
          4. WhatsApp: if whatsAppEnabled && User.phoneNumber → (deferred)
```

### 6.2 Design Choices

- **In-app first**: Notification row = in-app delivery; no separate "in_app" delivery row unless needed for consistency.
- **Email**: Synchronous send in V1 (or background job) via MailService (nodemailer/Resend/SES).
- **Idempotency**: `notification_deliveries` unique on (notificationId, userId, channel) prevents duplicate emails.
- **Failure handling**: Log failure, set status=failed; optional retry queue (V1.5).

### 6.3 Email Channel (V1)

- **Provider**: Resend or nodemailer+SMPT; config: `MAIL_FROM`, `RESEND_API_KEY` or `SMTP_*`.
- **Templates**: Simple HTML/text templates per notification type; include link to app (e.g. `/alerts/:id`, `/checklist-runs/:id`).
- **Rate limiting**: Respect provider limits; batch modestly if needed.

### 6.4 WhatsApp-Ready Extension Path

- **Schema**: `whatsAppEnabled` in preferences; `User.phoneNumber` for targeting.
- **Provider abstraction**: `NotificationChannel` interface: `send(userId, payload) => Promise<void>`.
- **V1.5**: Implement `WhatsAppChannel` using Twilio/WhatsApp Business API; register when ready.
- **No over-engineering**: No generic "channel adapter" framework; just add channels as needed.

---

## 7. Phased Execution Sequence

### Phase 1 — V1 Must-Have (Smallest Safe)

| # | Task | Scope |
|---|------|-------|
| 1 | User model: add `phoneNumber`, `passwordUpdatedAt` | Migration + Prisma |
| 2 | `password_reset_tokens` table + migration | Schema |
| 3 | `PATCH /users/me` (name, phoneNumber) | API + DTO |
| 4 | `POST /auth/change-password` | API + AuthService |
| 5 | `POST /auth/forgot-password`, `POST /auth/reset-password` | API + token flow |
| 6 | Email config + MailService (Resend or SMTP) | Infra |
| 7 | Forgot-password sends email with reset link | Wire MailService |
| 8 | `user_notification_preferences` table | Schema |
| 9 | `GET/PATCH /users/me/notification-preferences` | API |
| 10 | `notification_deliveries` table (optional but recommended) | Schema |
| 11 | NotificationDeliveryService + email send on createNotification | Hook after insert |
| 12 | Frontend: Profile page (view/edit name, phone) | UI |
| 13 | Frontend: Security page (change password) | UI |
| 14 | Frontend: Forgot password flow, Reset password page | UI |
| 15 | Frontend: Notification preferences page | UI |
| 16 | Sidebar/nav: Profile, Security, Notifications | Navigation |

### Phase 1.5 — Optional

| # | Task | Scope |
|---|------|-------|
| 17 | `jobTitle` on User | Schema + API |
| 18 | Email change with verification | Complex; defer if not critical |
| 19 | Per-event-type preferences (e.g. no email for CHECKLIST_DUE_SOON) | Preferences model extension |
| 20 | Refresh token storage + retry on 401 | Frontend auth improvement |
| 21 | Retry queue for failed email deliveries | Background job |

### Deferred

| # | Task | Notes |
|---|------|-------|
| 22 | WhatsApp channel | After WhatsApp Business API setup |
| 23 | SMS as channel | If needed |
| 24 | Push notifications | Web push or native |
| 25 | Org-level email template overrides | Advanced customization |

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|-------------|
| Email deliverability (spam) | Use reputable provider (Resend/SES); SPF/DKIM; avoid high volume bursts |
| Password reset abuse | Rate limit forgot-password by IP/email; 1h token expiry; generic success message |
| Preference migration | Default `emailEnabled=true`; create preference row on first read if missing |
| Notification volume spike | Batch size limits in cron; consider queue for email in V1.5 |
| WhatsApp vendor lock-in | Abstract behind `NotificationChannel` interface; minimal provider-specific code |
| Breaking existing auth | Change-password and reset are additive; existing login unchanged |

---

## 9. Smallest-Safe Implementation Recommendation

**Start with:**

1. **User fields** (phoneNumber, passwordUpdatedAt) + migration.
2. **password_reset_tokens** + forgot/reset flow (without email first; token in API response for manual testing, then add email).
3. **PATCH /users/me** for name, phone.
4. **POST /auth/change-password**.
5. **user_notification_preferences** + GET/PATCH API.
6. **MailService** + env config (RESEND_API_KEY or SMTP).
7. **Wire forgot-password to send email** with reset link.
8. **NotificationDeliveryService**: after each `createNotification` insert, check preferences, send email if enabled.
9. **Frontend**: Profile, Security, Notification Preferences pages + nav.

**Defer:** jobTitle, email change, per-type preferences, WhatsApp, delivery retry queue.

**Order of implementation:** Data model → Auth APIs (change + reset) → Profile APIs → Preferences → MailService → Delivery hook → Frontend pages.
