import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  AlertTriangle,
  TrendingUp,
  Settings,
  Users,
  Shield,
  PanelLeftClose,
  PanelLeft,
  ShieldCheck,
} from 'lucide-react';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { cn } from '@/lib/cn';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: ['checklist.run.view', 'alert.view'] as const },
  { to: '/checklist-templates', label: 'Checklist Templates', icon: FileText, permission: ['checklist.template.view', 'checklist.template.create'] as const },
  { to: '/checklist-runs', label: 'Checklist Runs', icon: ClipboardList, permission: 'checklist.run.view' as const },
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
        'flex shrink-0 flex-col bg-slate-900 transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center border-b border-slate-700/50',
          collapsed ? 'justify-center py-4' : 'gap-2 px-4 py-3'
        )}
      >
        <ShieldCheck className="h-5 w-5 shrink-0 text-white" aria-hidden />
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-white tracking-tight">
            PassControl
          </span>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
        {navItems.map(({ to, label, icon: Icon, permission }) => (
          <PermissionGate key={to} permission={permission}>
            <NavLink
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
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
          'flex items-center gap-3 border-t border-slate-700/50 p-3 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200',
          collapsed && 'justify-center px-2'
        )}
      >
        {collapsed ? (
          <PanelLeft className="h-5 w-5 shrink-0" />
        ) : (
          <>
            <PanelLeftClose className="h-5 w-5 shrink-0" />
            <span>Collapse</span>
          </>
        )}
      </button>
    </aside>
  );
}
