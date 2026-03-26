export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  /** From GET /auth/me; config-driven super admin list (SUPER_ADMIN_EMAILS). */
  isSuperAdmin?: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser;
  organizationId: string;
  roles: string[];
  permissions: string[];
  /** Omitted on older API versions; treat as false. */
  isSuperAdmin?: boolean;
}
