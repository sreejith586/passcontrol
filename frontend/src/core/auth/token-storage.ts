const ACCESS_TOKEN_KEY = 're_checklist_access_token';
const USER_KEY = 're_checklist_user';

/**
 * Access-token-only session. Backend has POST /auth/refresh but we do not use it;
 * 401 triggers re-login. Store only access token.
 */
export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(accessToken: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearTokens(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function setStoredUser(user: {
  id: string;
  email: string | null;
  name: string | null;
  isSuperAdmin?: boolean;
}): void {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): {
  id: string;
  email: string | null;
  name: string | null;
  isSuperAdmin?: boolean;
} | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      id: string;
      email: string | null;
      name: string | null;
      isSuperAdmin?: boolean;
    };
  } catch {
    return null;
  }
}
