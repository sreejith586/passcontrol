import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/core/auth/auth-context';
import { Button } from '@/shared/ui/Button';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { NotificationBell } from '@/features/notifications/NotificationBell';

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
            className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-background p-1 shadow-md"
          >
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
