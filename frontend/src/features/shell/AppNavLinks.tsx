import { NavLink } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { cn } from '@/lib/cn';
import { navGroups, topLevelItems, isChildActive } from './nav-config';

export interface AppNavLinksProps {
  collapsed: boolean;
  pathname: string;
  expandedGroups: Set<string>;
  toggleGroup: (id: string) => void;
}

export function AppNavLinks({
  collapsed,
  pathname,
  expandedGroups,
  toggleGroup,
}: AppNavLinksProps) {
  return (
    <>
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
        const isExpanded = expandedGroups.has(group.id);

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
                          className={({ isActive: childActive }) =>
                            cn(
                              'block px-3 py-2 text-sm outline-none',
                              childActive
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
                          className={({ isActive: childActive }) =>
                            cn(
                              'flex items-center rounded-md px-2.5 py-2 text-sm transition-colors',
                              childActive
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
    </>
  );
}
