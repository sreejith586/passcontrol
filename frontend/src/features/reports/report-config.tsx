import { format, subDays } from 'date-fns';
import type React from 'react';
import type { ReportFilters } from './api';
import type {
  CompletionReportPreviewRow,
  ConsolidatedOperationsPreviewRow,
  ChecklistItemStatusPreviewRow,
} from './api';
import type { ChecklistRun, FailedRunItem } from '@/features/checklist-runs/types';
import { RunStatusBadge } from '@/features/checklist-runs/components/RunStatusBadge';
import { SeverityBadge } from '@/features/alerts/components/SeverityBadge';
import { formatDateTime } from '@/lib/date';
import {
  getCompletionReportPreview,
  getConsolidatedOperationsPreview,
  getChecklistItemStatusPreview,
  getFailedItemsPreview,
  downloadCompletionReport,
  downloadConsolidatedOperationsReport,
  downloadChecklistItemStatusReport,
  downloadFailedItemsReport,
  downloadOverdueRunsReport,
} from './api';
import { getOverdueRuns } from '@/features/checklist-runs/api';

export const defaultFrom = format(subDays(new Date(), 30), 'yyyy-MM-dd');
export const defaultTo = format(new Date(), 'yyyy-MM-dd');

export type ReportType =
  | 'checklist-completion'
  | 'consolidated-operations'
  | 'checklist-item-status'
  | 'failed-items'
  | 'overdue-runs';

export interface ReportCatalogItem {
  type: ReportType;
  path: string;
  title: string;
  description: string;
}

export const REPORT_CATALOG: ReportCatalogItem[] = [
  {
    type: 'checklist-completion',
    path: '/reports/checklist-completion',
    title: 'Checklist Completion',
    description: 'Run completion status, due dates, assignees, and performers.',
  },
  {
    type: 'failed-items',
    path: '/reports/failed-items',
    title: 'Failed Items',
    description: 'Items marked as failed with severity, comments, and attachments.',
  },
  {
    type: 'overdue-runs',
    path: '/reports/overdue-runs',
    title: 'Overdue Runs',
    description: 'Checklist runs past due date, not yet completed.',
  },
  {
    type: 'consolidated-operations',
    path: '/reports/consolidated-operations',
    title: 'Consolidated Operations',
    description: 'Completion status with failed item counts and open alert counts.',
  },
  {
    type: 'checklist-item-status',
    path: '/reports/checklist-item-status',
    title: 'Checklist Item Status',
    description: 'Item-level results by section with pass/fail and severity.',
  },
];

export interface ReportColumnDef<T> {
  key: string;
  label: string;
  defaultVisible: boolean;
  render: (row: T) => React.ReactNode;
}

export interface ReportConfig<TRow = unknown> {
  type: ReportType;
  title: string;
  subtitle: string;
  showDateRange: boolean;
  showAssignee: boolean;
  showTemplateFilter: boolean;
  showResultFilter: boolean;
  showTemplateAndSeverity: boolean;
  getDefaultFilters: () => ReportFilters;
  queryKey: string;
  queryFn: (filters: ReportFilters) => Promise<{ items: TRow[]; total?: number }>;
  downloadFn: (filters: ReportFilters) => Promise<Blob>;
  downloadFilename: string;
  columns: ReportColumnDef<TRow>[];
  getRowId: (row: TRow) => string;
}

const completionColumns: ReportColumnDef<CompletionReportPreviewRow>[] = [
  { key: 'runNumber', label: 'Run #', defaultVisible: true, render: (r) => r.runNumber },
  { key: 'template', label: 'Template', defaultVisible: true, render: (r) => r.templateNameSnapshot },
  { key: 'status', label: 'Status', defaultVisible: true, render: (r) => <RunStatusBadge status={r.status} /> },
  { key: 'dueAt', label: 'Due At', defaultVisible: true, render: (r) => (r.dueAt ? formatDateTime(r.dueAt) : '—') },
  { key: 'startedAt', label: 'Started At', defaultVisible: false, render: (r) => (r.startedAt ? formatDateTime(r.startedAt) : '—') },
  { key: 'completedAt', label: 'Completed At', defaultVisible: true, render: (r) => (r.completedAt ? formatDateTime(r.completedAt) : '—') },
  { key: 'assignedTo', label: 'Assigned To', defaultVisible: true, render: (r) => r.assignedToUser?.name ?? 'Unassigned' },
  { key: 'performedBy', label: 'Performed By', defaultVisible: false, render: (r) => r.performedByUser?.name ?? '—' },
];

const consolidatedColumns: ReportColumnDef<ConsolidatedOperationsPreviewRow>[] = [
  ...completionColumns,
  { key: 'failedItemCount', label: 'Failed Items', defaultVisible: true, render: (r) => r.failedItemCount ?? 0 },
  { key: 'openAlertCount', label: 'Open Alerts', defaultVisible: true, render: (r) => r.openAlertCount ?? 0 },
];

const itemStatusColumns: ReportColumnDef<ChecklistItemStatusPreviewRow>[] = [
  { key: 'runNumber', label: 'Run #', defaultVisible: true, render: (r) => r.runNumber },
  { key: 'template', label: 'Template', defaultVisible: true, render: (r) => r.templateNameSnapshot },
  { key: 'section', label: 'Section', defaultVisible: true, render: (r) => r.sectionTitle || '—' },
  { key: 'label', label: 'Item Label', defaultVisible: true, render: (r) => r.labelSnapshot },
  { key: 'itemType', label: 'Item Type', defaultVisible: false, render: (r) => r.itemTypeSnapshot },
  { key: 'result', label: 'Result', defaultVisible: true, render: (r) => r.result ?? '—' },
  { key: 'severity', label: 'Severity', defaultVisible: true, render: (r) => <SeverityBadge severity={r.severitySnapshot} /> },
  { key: 'comment', label: 'Comment', defaultVisible: true, render: (r) => r.comment ?? '—' },
  { key: 'attachmentCount', label: 'Attachments', defaultVisible: true, render: (r) => r.attachmentCount },
  { key: 'dueAt', label: 'Due At', defaultVisible: true, render: (r) => (r.dueAt ? formatDateTime(r.dueAt) : '—') },
];

const failedItemsColumns: ReportColumnDef<FailedRunItem>[] = [
  { key: 'runNumber', label: 'Run #', defaultVisible: true, render: (r) => r.checklistRun.runNumber },
  { key: 'template', label: 'Template', defaultVisible: true, render: (r) => r.checklistRun.templateNameSnapshot },
  { key: 'label', label: 'Item Label', defaultVisible: true, render: (r) => r.label },
  { key: 'severity', label: 'Severity', defaultVisible: true, render: (r) => <SeverityBadge severity={r.severitySnapshot} /> },
  { key: 'comment', label: 'Comment', defaultVisible: true, render: (r) => r.comment ?? '—' },
  { key: 'attachmentCount', label: 'Attachments', defaultVisible: true, render: (r) => r.attachmentCount },
  { key: 'dueAt', label: 'Due At', defaultVisible: true, render: (r) => (r.checklistRun.dueAt ? formatDateTime(r.checklistRun.dueAt) : '—') },
];

const overdueColumns: ReportColumnDef<ChecklistRun>[] = [
  { key: 'runNumber', label: 'Run #', defaultVisible: true, render: (r) => r.runNumber },
  { key: 'template', label: 'Template', defaultVisible: true, render: (r) => r.templateNameSnapshot },
  { key: 'status', label: 'Status', defaultVisible: true, render: (r) => <RunStatusBadge status={r.status} /> },
  { key: 'dueAt', label: 'Due At', defaultVisible: true, render: (r) => (r.dueAt ? formatDateTime(r.dueAt) : '—') },
  { key: 'assignedTo', label: 'Assigned To', defaultVisible: true, render: (r) => r.assignedToUser?.name ?? 'Unassigned' },
];

function getDefaultColumnVisibility(
  cols: ReportColumnDef<unknown>[]
): Record<string, boolean> {
  return Object.fromEntries(cols.map((c) => [c.key, c.defaultVisible]));
}

export function getDefaultColumnVisibilityForReport(type: ReportType): Record<string, boolean> {
  const cols = getColumnsForReport(type);
  return getDefaultColumnVisibility(cols);
}

export function getColumnsForReport(
  type: ReportType
): ReportColumnDef<unknown>[] {
  switch (type) {
    case 'checklist-completion':
      return completionColumns as ReportColumnDef<unknown>[];
    case 'consolidated-operations':
      return consolidatedColumns as ReportColumnDef<unknown>[];
    case 'checklist-item-status':
      return itemStatusColumns as ReportColumnDef<unknown>[];
    case 'failed-items':
      return failedItemsColumns as ReportColumnDef<unknown>[];
    case 'overdue-runs':
      return overdueColumns as ReportColumnDef<unknown>[];
    default:
      return completionColumns as ReportColumnDef<unknown>[];
  }
}

export function getReportConfig(type: ReportType): ReportConfig<unknown> {
  const base = {
    getRowId: (row: unknown) => (row as { id: string }).id,
  };
  switch (type) {
    case 'checklist-completion':
      return {
        ...base,
        type: 'checklist-completion',
        title: 'Checklist Completion',
        subtitle: 'Run completion status, due dates, assignees, and performers.',
        showDateRange: true,
        showAssignee: true,
        showTemplateFilter: false,
        showResultFilter: false,
        showTemplateAndSeverity: false,
        getDefaultFilters: () => ({ from: defaultFrom, to: defaultTo }),
        queryKey: 'reports-completion',
        queryFn: (f) =>
          getCompletionReportPreview({
            ...f,
            from: f.from ?? defaultFrom,
            to: f.to ?? defaultTo,
            page: 1,
            limit: 100,
          }),
        downloadFn: downloadCompletionReport,
        downloadFilename: 'checklist-completion-report.xlsx',
        columns: completionColumns as ReportColumnDef<unknown>[],
      };
    case 'consolidated-operations':
      return {
        ...base,
        type: 'consolidated-operations',
        title: 'Consolidated Operations',
        subtitle: 'Completion status with failed item counts and open alert counts.',
        showDateRange: true,
        showAssignee: true,
        showTemplateFilter: false,
        showResultFilter: false,
        showTemplateAndSeverity: false,
        getDefaultFilters: () => ({ from: defaultFrom, to: defaultTo }),
        queryKey: 'reports-consolidated',
        queryFn: (f) =>
          getConsolidatedOperationsPreview({
            ...f,
            from: f.from ?? defaultFrom,
            to: f.to ?? defaultTo,
            page: 1,
            limit: 100,
          }),
        downloadFn: downloadConsolidatedOperationsReport,
        downloadFilename: 'consolidated-operations-report.xlsx',
        columns: consolidatedColumns as ReportColumnDef<unknown>[],
      };
    case 'checklist-item-status':
      return {
        ...base,
        type: 'checklist-item-status',
        title: 'Checklist Item Status',
        subtitle: 'Item-level results by section with pass/fail and severity.',
        showDateRange: true,
        showAssignee: true,
        showTemplateFilter: true,
        showResultFilter: true,
        showTemplateAndSeverity: false,
        getDefaultFilters: () => ({ from: defaultFrom, to: defaultTo }),
        queryKey: 'reports-item-status',
        queryFn: (f) =>
          getChecklistItemStatusPreview({
            ...f,
            from: f.from ?? defaultFrom,
            to: f.to ?? defaultTo,
            page: 1,
            limit: 100,
          }),
        downloadFn: downloadChecklistItemStatusReport,
        downloadFilename: 'checklist-item-status-report.xlsx',
        columns: itemStatusColumns as ReportColumnDef<unknown>[],
      };
    case 'failed-items':
      return {
        ...base,
        type: 'failed-items',
        title: 'Failed Items',
        subtitle: 'Items marked as failed with severity, comments, and attachments.',
        showDateRange: true,
        showAssignee: false,
        showTemplateFilter: true,
        showResultFilter: false,
        showTemplateAndSeverity: true,
        getDefaultFilters: () => ({ from: defaultFrom, to: defaultTo }),
        queryKey: 'reports-failed-items',
        queryFn: (f) =>
          getFailedItemsPreview({
            ...f,
            from: f.from ?? defaultFrom,
            to: f.to ?? defaultTo,
            page: 1,
            limit: 100,
          }),
        downloadFn: downloadFailedItemsReport,
        downloadFilename: 'failed-items-report.xlsx',
        columns: failedItemsColumns as ReportColumnDef<unknown>[],
      };
    case 'overdue-runs':
      return {
        ...base,
        type: 'overdue-runs',
        title: 'Overdue Runs',
        subtitle: 'Checklist runs past due date, not yet completed.',
        showDateRange: false,
        showAssignee: true,
        showTemplateFilter: true,
        showResultFilter: false,
        showTemplateAndSeverity: false,
        getDefaultFilters: () => ({}),
        queryKey: 'reports-overdue',
        queryFn: (f) =>
          getOverdueRuns({
            ...f,
            page: 1,
            limit: 100,
          }),
        downloadFn: downloadOverdueRunsReport,
        downloadFilename: 'overdue-runs-report.xlsx',
        columns: overdueColumns as ReportColumnDef<unknown>[],
      };
    default:
      return getReportConfig('checklist-completion');
  }
}
