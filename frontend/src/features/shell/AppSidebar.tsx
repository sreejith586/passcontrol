import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  TrendingUp,
  Settings,
  Users,
  Shield,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { cn } from '@/lib/cn';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: ['checklist.run.view', 'alert.view'] as const },
  { to: '/alerts', label: 'Alerts', icon: AlertTriangle, permission: 'alert.view' as const },
  { to: '/escalations', label: 'Escalations', icon: TrendingUp, permission: 'alert.view' as const },
  { to: '/settings/alert-workflow', label: 'Settings', icon: Settings, permission: 'alert.workflow-policy.view' as const },
  { to: '/settings/users', label: 'Users', icon: Users, permission: 'user.view' as const },
  { to: '/settings/roles', label: 'Roles', icon: Shield, permission: 'user.view' as const },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-border bg-muted/30 transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {!collapsed && (
        <div className="border-b border-border px-3 py-3">
          <span className="text-sm font-semibold text-foreground">
            PassControl
          </span>
        </div>
      )}
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map(({ to, label, icon: Icon, permission }) => (
          <PermissionGate key={to} permission={permission}>
            <NavLink
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          </PermissionGate>
        ))}
      </nav>
      <button
        type="button"
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'flex items-center gap-2 border-t border-border p-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          collapsed && 'justify-center px-2'
        )}
      >
        {collapsed ? (
          <PanelLeft className="h-5 w-5" />
        ) : (
          <>
            <PanelLeftClose className="h-5 w-5" />
            <span>Collapse</span>
          </>
        )}
      </button>
    </aside>
  );
}
