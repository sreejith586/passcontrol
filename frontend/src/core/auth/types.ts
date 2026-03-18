export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
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
}
