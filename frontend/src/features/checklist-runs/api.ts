import { get, post, patch, del, postForm } from '@/core/api/client';
import type {
  ChecklistRun,
  ChecklistRunListResponse,
  ListTodayRunsParams,
  ListOverdueRunsParams,
  ListFailedRunsParams,
  RunItemDetail,
  RunItemAttachment,
} from './types';

export async function getTodayRuns(
  params?: ListTodayRunsParams
): Promise<ChecklistRunListResponse> {
  const searchParams: Record<string, string> = {};
  if (params?.status) searchParams.status = params.status;
  if (params?.page) searchParams.page = String(params.page);
  if (params?.limit) searchParams.limit = String(params.limit);
  if (params?.timezone) searchParams.timezone = params.timezone;
  if (params?.date) searchParams.date = params.date;
  searchParams.view = 'full';
  return get<ChecklistRunListResponse>('/checklist-runs/today', searchParams);
}

export async function getOverdueRuns(
  params?: ListOverdueRunsParams
): Promise<ChecklistRunListResponse> {
  const searchParams: Record<string, string> = {};
  if (params?.page) searchParams.page = String(params.page);
  if (params?.limit) searchParams.limit = String(params.limit);
  searchParams.view = 'full';
  return get<ChecklistRunListResponse>('/checklist-runs/overdue', searchParams);
}

export async function getFailedRuns(
  params?: ListFailedRunsParams
): Promise<ChecklistRunListResponse> {
  const searchParams: Record<string, string> = {};
  if (params?.page) searchParams.page = String(params.page);
  if (params?.limit) searchParams.limit = String(params.limit);
  if (params?.from) searchParams.from = params.from;
  if (params?.to) searchParams.to = params.to;
  searchParams.view = 'full';
  return get<ChecklistRunListResponse>('/checklist-runs/failed', searchParams);
}

export async function getRunById(id: string): Promise<ChecklistRun> {
  return get<ChecklistRun>(`/checklist-runs/${id}`);
}

export async function updateRunItem(
  itemId: string,
  data: { result?: string; valueJson?: Record<string, unknown>; comment?: string }
): Promise<unknown> {
  return patch(`/checklist-run-items/${itemId}`, data);
}

export async function submitRun(runId: string): Promise<ChecklistRun> {
  return post<ChecklistRun>(`/checklist-runs/${runId}/submit`);
}

export async function getRunItemById(itemId: string): Promise<RunItemDetail> {
  return get<RunItemDetail>(`/checklist-run-items/${itemId}`);
}

export async function deleteAttachment(attachmentId: string): Promise<{ id: string; deleted: boolean }> {
  return del<{ id: string; deleted: boolean }>(`/attachments/${attachmentId}`);
}

export async function uploadEvidence(itemId: string, file: File): Promise<RunItemAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  return postForm<RunItemAttachment>(`/checklist-run-items/${itemId}/evidence`, formData);
}
