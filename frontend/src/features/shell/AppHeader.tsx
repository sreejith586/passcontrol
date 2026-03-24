import { Link, NavLink } from 'react-router-dom';
import { ChevronDown, LogOut, User, Shield, Bell, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/core/auth/auth-context';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { get } from '@/core/api/client';

function getInitials(name: string | null, email: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
}

function useOrganizationName(organizationId: string | null): string | null {
  const { data } = useQuery({
    queryKey: ['organization-settings', 'context', organizationId] as const,
    queryFn: () => get<{ name?: string | null }>('/organization-settings/context'),
    enabled: !!organizationId,
  });
  return data?.name ?? null;
}

export function AppHeader() {
  const { user, logout, organizationId } = useAuth();
  const orgName = useOrganizationName(organizationId);

  const displayName = user?.name ?? user?.email ?? 'User';
  const initials = getInitials(user?.name ?? null, user?.email ?? null);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-8 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Link
          to="/alerts"
          className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            PassControl
          </span>
        </Link>
        {orgName && (
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">
            {orgName}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 justify-center" aria-hidden>
        {/* Reserved for future search / command area */}
        <div className="h-8 w-64" />
      </div>

      <div className="flex min-w-0 flex-1 justify-end items-center gap-2">
        <NotificationBell />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-700">
                {initials}
              </span>
              <span className="hidden max-w-[120px] truncate text-sm font-medium text-foreground sm:inline">
                {displayName}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            align="end"
            className="z-50 min-w-[11rem] overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          >
            <PermissionGate permission={['alert.workflow-policy.view', 'user.view']} mode="hide">
              <DropdownMenu.Item asChild>
                <NavLink
                  to="/settings/profile"
                  className="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm outline-none hover:bg-slate-100 focus:bg-slate-100"
                >
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  My Profile
                </NavLink>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <NavLink
                  to="/settings/security"
                  className="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm outline-none hover:bg-slate-100 focus:bg-slate-100"
                >
                  <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
                  Security
                </NavLink>
              </DropdownMenu.Item>
            </PermissionGate>
            <PermissionGate permission="alert.view" mode="hide">
              <DropdownMenu.Item asChild>
                <NavLink
                  to="/settings/notifications"
                  className="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm outline-none hover:bg-slate-100 focus:bg-slate-100"
                >
                  <Bell className="mr-2 h-4 w-4 text-muted-foreground" />
                  Notification Preferences
                </NavLink>
              </DropdownMenu.Item>
            </PermissionGate>
            <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />
            <DropdownMenu.Item
              onSelect={logout}
              className="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm text-destructive outline-none hover:bg-red-50 focus:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
