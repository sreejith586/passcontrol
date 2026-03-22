import { get, getBlob } from '@/core/api/client';
import type { FailedRunItemsListResponse } from '@/features/checklist-runs/types';

export interface ReportFilters {
  brandId?: string;
  locationId?: string;
  zoneId?: string;
  from?: string;
  to?: string;
  assignedToMe?: boolean;
  checklistTemplateId?: string;
  severity?: string;
  result?: 'PASS' | 'FAIL';
}

function toParams(filters: ReportFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.brandId) params.brandId = filters.brandId;
  if (filters.locationId) params.locationId = filters.locationId;
  if (filters.zoneId) params.zoneId = filters.zoneId;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.assignedToMe === true) params.assignedToMe = 'true';
  if (filters.checklistTemplateId) params.checklistTemplateId = filters.checklistTemplateId;
  if (filters.severity) params.severity = filters.severity;
  if (filters.result) params.result = filters.result;
  return params;
}

/** Run summary row from completion report preview (compatible with table rendering) */
export interface CompletionReportPreviewRow {
  id: string;
  runNumber: number;
  templateNameSnapshot: string;
  status: string;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  assignedToUser?: { id: string; name: string } | null;
  performedByUser?: { id: string; name: string } | null;
}

export interface CompletionReportPreviewResponse {
  items: CompletionReportPreviewRow[];
  total: number;
  page: number;
  limit: number;
}

export async function getCompletionReportPreview(
  filters: ReportFilters & { page?: number; limit?: number } = {}
): Promise<CompletionReportPreviewResponse> {
  const params = toParams(filters);
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);
  return get<CompletionReportPreviewResponse>('/reports/checklist-completion', params);
}

export async function downloadCompletionReport(filters: ReportFilters = {}): Promise<Blob> {
  return getBlob('/reports/checklist-completion/export', toParams(filters));
}

export async function getFailedItemsPreview(
  filters: ReportFilters & { page?: number; limit?: number } = {}
): Promise<FailedRunItemsListResponse> {
  const params = toParams(filters);
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);
  return get<FailedRunItemsListResponse>('/reports/failed-items', params);
}

export async function downloadFailedItemsReport(filters: ReportFilters = {}): Promise<Blob> {
  return getBlob('/reports/failed-items/export', toParams(filters));
}

export async function downloadOverdueRunsReport(filters: ReportFilters = {}): Promise<Blob> {
  return getBlob('/reports/overdue-runs/export', toParams(filters));
}

/** Consolidated operations row (run + failedItemCount, openAlertCount) */
export interface ConsolidatedOperationsPreviewRow extends CompletionReportPreviewRow {
  failedItemCount: number;
  openAlertCount: number;
}

export interface ConsolidatedOperationsPreviewResponse {
  items: ConsolidatedOperationsPreviewRow[];
  total: number;
  page: number;
  limit: number;
}

export async function getConsolidatedOperationsPreview(
  filters: ReportFilters & { page?: number; limit?: number } = {}
): Promise<ConsolidatedOperationsPreviewResponse> {
  const params = toParams(filters);
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);
  return get<ConsolidatedOperationsPreviewResponse>('/reports/consolidated-operations', params);
}

export async function downloadConsolidatedOperationsReport(filters: ReportFilters = {}): Promise<Blob> {
  return getBlob('/reports/consolidated-operations/export', toParams(filters));
}

/** Checklist item status row (item-level) */
export interface ChecklistItemStatusPreviewRow {
  id: string;
  checklistRunId: string;
  labelSnapshot: string;
  itemTypeSnapshot: string;
  result: string | null;
  comment: string | null;
  severitySnapshot: string;
  sectionTitle: string;
  runNumber: number;
  templateNameSnapshot: string;
  dueAt: string | null;
  attachmentCount: number;
}

export interface ChecklistItemStatusPreviewResponse {
  items: ChecklistItemStatusPreviewRow[];
  total: number;
  page: number;
  limit: number;
}

export async function getChecklistItemStatusPreview(
  filters: ReportFilters & { page?: number; limit?: number } = {}
): Promise<ChecklistItemStatusPreviewResponse> {
  const params = toParams(filters);
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);
  return get<ChecklistItemStatusPreviewResponse>('/reports/checklist-item-status', params);
}

export async function downloadChecklistItemStatusReport(filters: ReportFilters = {}): Promise<Blob> {
  return getBlob('/reports/checklist-item-status/export', toParams(filters));
}
