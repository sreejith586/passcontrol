import { Link, NavLink } from 'react-router-dom';
import { LogOut, User, Shield, Bell } from 'lucide-react';
import { useAuth } from '@/core/auth/auth-context';
import { Button } from '@/shared/ui/Button';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { PermissionGate } from '@/core/permissions/PermissionGate';

export function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <Link to="/alerts" className="text-lg font-semibold text-foreground">
        PassControl
      </Link>
      <div className="flex items-center gap-1">
        <NotificationBell />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <span className="max-w-[160px] truncate">
                {user?.name ?? user?.email ?? 'User'}
              </span>
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            align="end"
            className="z-50 min-w-[10rem] overflow-hidden rounded-md border border-border bg-background p-1 shadow-md"
          >
            <PermissionGate permission={['alert.workflow-policy.view', 'user.view']} mode="hide">
              <DropdownMenu.Item asChild>
                <NavLink
                  to="/settings/profile"
                  className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-muted"
                >
                  <User className="mr-2 h-4 w-4" />
                  My Profile
                </NavLink>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <NavLink
                  to="/settings/security"
                  className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-muted"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Security
                </NavLink>
              </DropdownMenu.Item>
            </PermissionGate>
            <PermissionGate permission="alert.view" mode="hide">
              <DropdownMenu.Item asChild>
                <NavLink
                  to="/settings/notifications"
                  className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-muted"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Notification Preferences
                </NavLink>
              </DropdownMenu.Item>
            </PermissionGate>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              onSelect={logout}
              className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-destructive outline-none focus:bg-muted"
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
