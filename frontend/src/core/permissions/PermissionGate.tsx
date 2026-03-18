import { usePermissions } from './use-permission';

interface PermissionGateProps {
  permission: string | readonly string[];
  mode?: 'hide' | 'disable';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  mode = 'hide',
  fallback = null,
  children,
}: PermissionGateProps) {
  const hasPermission = usePermissions(permission);

  if (!hasPermission) {
    if (mode === 'hide') return <>{fallback}</>;
    return (
      <span className="inline-block cursor-not-allowed opacity-50" title="No permission">
        {children}
      </span>
    );
  }

  return <>{children}</>;
}
