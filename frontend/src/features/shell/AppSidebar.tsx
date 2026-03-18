import { NavLink } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, TrendingUp, Settings } from 'lucide-react';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { cn } from '@/lib/cn';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: ['checklist.run.view', 'alert.view'] as const },
  { to: '/alerts', label: 'Alerts', icon: AlertTriangle, permission: 'alert.view' as const },
  { to: '/escalations', label: 'Escalations', icon: TrendingUp, permission: 'alert.view' as const },
  { to: '/settings/alert-workflow', label: 'Settings', icon: Settings, permission: 'alert.workflow-policy.view' as const },
];

export function AppSidebar() {
  return (
    <aside className="flex w-56 flex-col border-r border-border bg-muted/30">
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map(({ to, label, icon: Icon, permission }) => (
          <PermissionGate key={to} permission={permission}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          </PermissionGate>
        ))}
      </nav>
    </aside>
  );
}
