import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  AlertTriangle,
  Settings,
  FileBarChart,
} from 'lucide-react';

export type NavPermission = string | readonly string[];

export interface NavGroupChild {
  to: string;
  label: string;
  permission: NavPermission;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  permission: NavPermission;
  children: NavGroupChild[];
}

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  permission: NavPermission;
}

export const navGroups: NavGroup[] = [
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
      {
        to: '/checklist-templates',
        label: 'Templates',
        permission: ['checklist.template.view', 'checklist.template.create'] as const,
      },
      {
        to: '/checklist-schedules',
        label: 'Schedules',
        permission: ['checklist.schedule.view', 'checklist.schedule.create'] as const,
      },
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
      {
        to: '/reports/consolidated-operations',
        label: 'Consolidated Operations',
        permission: 'reports.view' as const,
      },
      {
        to: '/reports/checklist-item-status',
        label: 'Checklist Item Status',
        permission: 'reports.view' as const,
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    permission: ['alert.workflow-policy.view', 'user.view'] as const,
    children: [
      { to: '/settings/organization', label: 'Organization', permission: 'alert.workflow-policy.view' as const },
      { to: '/settings/users', label: 'Users', permission: 'user.view' as const },
      { to: '/settings/roles', label: 'Roles', permission: 'user.view' as const },
    ],
  },
];

export const topLevelItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    permission: ['checklist.run.view', 'alert.view'] as const,
  },
];

export function isChildActive(pathname: string, group: NavGroup): boolean {
  return group.children.some((c) => pathname === c.to || pathname.startsWith(c.to + '/'));
}
