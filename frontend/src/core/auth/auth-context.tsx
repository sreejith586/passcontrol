import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, MeResponse } from './types';
import {
  getAccessToken,
  setStoredUser,
  setAccessToken,
  clearTokens,
} from './token-storage';
import { get } from '@/core/api/client';
import { setTokenGetter, setOnUnauthorized } from '@/core/api/client';
import { analytics } from '@/lib/analytics/analytics';

interface AuthState {
  user: AuthUser | null;
  organizationId: string | null;
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (session: { accessToken: string; user: AuthUser }) => void | Promise<void>;
  logout: () => void;
  setSession: (me: MeResponse) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    organizationId: null,
    permissions: [],
    isLoading: true,
    isAuthenticated: false,
  });

  const logout = useCallback(() => {
    clearTokens();
    setState({
      user: null,
      organizationId: null,
      permissions: [],
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  const setSession = useCallback((me: MeResponse) => {
    const isSuperAdmin =
      me.isSuperAdmin != null
        ? me.isSuperAdmin
        : Boolean(me.roles?.includes('super_admin') || me.user.isSuperAdmin);

    const user = { ...me.user, isSuperAdmin };
    setStoredUser(user);
    setState({
      user,
      organizationId: me.organizationId,
      permissions: me.permissions ?? [],
      isLoading: false,
      isAuthenticated: true,
    });
    analytics.identify(me.user.id, {
      email: me.user.email ?? undefined,
      organizationId: me.organizationId,
    });
  }, []);

  const refreshSession = useCallback(async () => {
    const me = await get<MeResponse>('/v1/auth/me');
    setSession(me);
  }, [setSession]);

  const login = useCallback(
    async (session: { accessToken: string; user: AuthUser }) => {
      setAccessToken(session.accessToken);
      setStoredUser(session.user);
      setState((prev) => ({
        ...prev,
        user: session.user,
        permissions: [],
        isLoading: true,
        isAuthenticated: true,
      }));
      try {
        const me = await get<MeResponse>('/v1/auth/me');
        setSession(me);
      } catch {
        logout();
      }
    },
    [setSession, logout]
  );

  useEffect(() => {
    setTokenGetter(getAccessToken);
    setOnUnauthorized(logout);
  }, [logout]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }
    get<MeResponse>('/v1/auth/me')
      .then(setSession)
      .catch(() => {
        logout();
      });
  }, [setSession, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      setSession,
      refreshSession,
    }),
    [state, login, logout, setSession, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
