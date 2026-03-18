import { useLocation } from 'react-router-dom';
import { useAuth } from '@/core/auth/auth-context';
import { getRoutePermission } from './permission-map';
import { UnauthorizedFallback } from './UnauthorizedFallback';

interface RoutePermissionGuardProps {
  children: React.ReactNode;
}

export function RoutePermissionGuard({ children }: RoutePermissionGuardProps) {
  const location = useLocation();
  const { permissions } = useAuth();
  const required = getRoutePermission(location.pathname);

  if (!required) {
    return <>{children}</>;
  }

  const hasAccess = Array.isArray(required)
    ? required.some((p) => permissions.includes(p))
    : permissions.includes(required);

  if (!hasAccess) {
    return <UnauthorizedFallback />;
  }

  return <>{children}</>;
}
