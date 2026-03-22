import { get, post, patch } from '@/core/api/client';

export interface ChecklistScheduleTemplate {
  id: string;
  templateKey: string;
  name: string;
  version: number;
  status: string;
}

export interface ChecklistSchedule {
  id: string;
  organizationId: string;
  checklistTemplateId: string;
  checklistTemplate: ChecklistScheduleTemplate;
  name: string;
  timezone: string;
  rrule: string;
  nextRunAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  brandId: string | null;
  locationId: string | null;
  zoneId: string | null;
  ownerUserId: string | null;
  ownerUser?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchedulePayload {
  checklistTemplateId: string;
  name: string;
  timezone: string;
  rrule: string;
  brandId?: string;
  locationId?: string;
  zoneId?: string;
  ownerUserId?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface UpdateSchedulePayload {
  name?: string;
  timezone?: string;
  rrule?: string;
  brandId?: string | null;
  locationId?: string | null;
  zoneId?: string | null;
  ownerUserId?: string | null;
  startsAt?: string;
  endsAt?: string;
}

export interface ListSchedulesParams {
  checklistTemplateId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export async function listSchedules(
  params?: ListSchedulesParams
): Promise<ChecklistSchedule[]> {
  const searchParams: Record<string, string> = {};
  if (params?.checklistTemplateId)
    searchParams.checklistTemplateId = params.checklistTemplateId;
  if (params?.isActive !== undefined)
    searchParams.isActive = String(params.isActive);
  if (params?.page) searchParams.page = String(params.page);
  if (params?.limit) searchParams.limit = String(params.limit);
  return get<ChecklistSchedule[]>('/checklist-schedules', searchParams);
}

export async function getScheduleById(
  id: string
): Promise<ChecklistSchedule> {
  return get<ChecklistSchedule>(`/checklist-schedules/${id}`);
}

export interface PreviewNextRunParams {
  rrule: string;
  timezone: string;
  startsAt?: string;
  endsAt?: string;
}

export interface PreviewNextRunResult {
  nextRunAt: string | null;
}

export async function previewNextRun(
  params: PreviewNextRunParams,
): Promise<PreviewNextRunResult> {
  return post<PreviewNextRunResult>(
    '/checklist-schedules/preview-next-run',
    params,
  );
}

export async function createSchedule(
  payload: CreateSchedulePayload
): Promise<ChecklistSchedule> {
  return post<ChecklistSchedule>('/checklist-schedules', payload);
}

export async function updateSchedule(
  id: string,
  payload: UpdateSchedulePayload
): Promise<ChecklistSchedule> {
  return patch<ChecklistSchedule>(`/checklist-schedules/${id}`, payload);
}

export async function activateSchedule(
  id: string
): Promise<ChecklistSchedule> {
  return post<ChecklistSchedule>(`/checklist-schedules/${id}/activate`, {});
}

export async function deactivateSchedule(
  id: string
): Promise<ChecklistSchedule> {
  return post<ChecklistSchedule>(`/checklist-schedules/${id}/deactivate`, {});
}

export interface ChecklistRun {
  id: string;
}

export async function generateRunFromSchedule(
  scheduleId: string,
  dueAt?: string
): Promise<ChecklistRun> {
  return post<ChecklistRun>(
    `/checklist-schedules/${scheduleId}/generate-run`,
    dueAt ? { dueAt } : {}
  );
}
