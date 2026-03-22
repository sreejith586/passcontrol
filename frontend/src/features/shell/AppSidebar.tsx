import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  AlertTriangle,
  Settings,
  PanelLeftClose,
  PanelLeft,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  FileBarChart,
} from 'lucide-react';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { cn } from '@/lib/cn';

type NavPermission = string | readonly string[];

interface NavGroupChild {
  to: string;
  label: string;
  permission: NavPermission;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: NavPermission;
  children: NavGroupChild[];
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: NavPermission;
}

const navGroups: NavGroup[] = [
  {
    id: 'checklists',
    label: 'Checklists',
    icon: ClipboardList,
    permission: [
      'checklist.template.view',
      'checklist.template.create',
      'checklist.schedule.view',
      'checklist.schedule.create',
      'checklist.run.view',
    ] as const,
    children: [
      { to: '/checklist-templates', label: 'Templates', permission: ['checklist.template.view', 'checklist.template.create'] as const },
      { to: '/checklist-schedules', label: 'Schedules', permission: ['checklist.schedule.view', 'checklist.schedule.create'] as const },
      { to: '/checklist-runs', label: 'Runs', permission: 'checklist.run.view' as const },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: Building2,
    permission: ['brand.view', 'brand.manage', 'location.view', 'location.manage', 'zone.view', 'zone.manage'] as const,
    children: [
      { to: '/brands', label: 'Brands', permission: ['brand.view', 'brand.manage'] as const },
      { to: '/locations', label: 'Locations', permission: ['location.view', 'location.manage'] as const },
      { to: '/zones', label: 'Zones', permission: ['zone.view', 'zone.manage'] as const },
    ],
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: AlertTriangle,
    permission: 'alert.view' as const,
    children: [
      { to: '/alerts', label: 'Alerts', permission: 'alert.view' as const },
      { to: '/escalations', label: 'Escalations', permission: 'alert.view' as const },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileBarChart,
    permission: 'reports.view' as const,
    children: [
      { to: '/reports', label: 'Overview', permission: 'reports.view' as const },
      { to: '/reports/checklist-completion', label: 'Checklist Completion', permission: 'reports.view' as const },
      { to: '/reports/failed-items', label: 'Failed Items', permission: 'reports.view' as const },
      { to: '/reports/overdue-runs', label: 'Overdue Runs', permission: 'reports.view' as const },
      { to: '/reports/consolidated-operations', label: 'Consolidated Operations', permission: 'reports.view' as const },
      { to: '/reports/checklist-item-status', label: 'Checklist Item Status', permission: 'reports.view' as const },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    permission: ['alert.workflow-policy.view', 'user.view'] as const,
    children: [
      { to: '/settings/organization', label: 'Organization Settings', permission: 'alert.workflow-policy.view' as const },
      { to: '/settings/users', label: 'Users', permission: 'user.view' as const },
      { to: '/settings/roles', label: 'Roles', permission: 'user.view' as const },
    ],
  },
];

const topLevelItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: ['checklist.run.view', 'alert.view'] as const },
];

function isChildActive(pathname: string, group: NavGroup): boolean {
  return group.children.some(
    (c) => pathname === c.to || pathname.startsWith(c.to + '/')
  );
}

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { pathname } = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    navGroups.forEach((g) => {
      if (isChildActive(pathname, g)) expanded.add(g.id);
    });
    return expanded;
  });

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      navGroups.forEach((g) => {
        if (isChildActive(pathname, g)) next.add(g.id);
      });
      return next;
    });
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
        {topLevelItems.map(({ to, label, icon: Icon, permission }) => (
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

        {navGroups.map((group) => {
          const isActive = isChildActive(pathname, group);
          const isExpanded = expandedGroups.has(group.id) || isActive;

          return (
            <PermissionGate key={group.id} permission={group.permission}>
              {collapsed ? (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      title={group.label}
                      className={cn(
                        'flex w-full items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      )}
                    >
                      <group.icon className="h-5 w-5 shrink-0" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content
                    side="right"
                    sideOffset={4}
                    align="start"
                    className="z-50 min-w-[10rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
                  >
                      {group.children.map((child) => (
                        <PermissionGate key={child.to} permission={child.permission}>
                          <DropdownMenu.Item asChild>
                            <NavLink
                              to={child.to}
                              className={({ isActive }) =>
                                cn(
                                  'block px-3 py-2 text-sm outline-none',
                                  isActive
                                    ? 'bg-slate-100 font-medium text-slate-900 dark:bg-slate-700 dark:text-white'
                                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                                )
                              }
                            >
                              {child.label}
                            </NavLink>
                          </DropdownMenu.Item>
                        </PermissionGate>
                      ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              ) : (
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    )}
                  >
                    <group.icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 text-left">{group.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-4 space-y-0.5 border-l border-slate-700/50 pl-2">
                      {group.children.map((child) => (
                        <PermissionGate key={child.to} permission={child.permission}>
                          <NavLink
                            to={child.to}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center rounded-md px-2.5 py-2 text-sm transition-colors',
                                isActive
                                  ? 'bg-white/10 font-medium text-white'
                                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                              )
                            }
                          >
                            {child.label}
                          </NavLink>
                        </PermissionGate>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </PermissionGate>
          );
        })}
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
