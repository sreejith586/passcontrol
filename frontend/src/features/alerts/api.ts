import { get, post } from '@/core/api/client';
import type { PaginatedData } from '@/core/api/types';
import type {
  AlertEvent,
  AlertEventActivity,
  AlertEventComment,
  ListAlertsParams,
} from './types';

/**
 * List alerts. Query params match ListAlertEventsQueryDto.
 * assignedToMe/unassignedOnly sent as booleans; backend Transform handles.
 */
export async function listAlerts(
  params: ListAlertsParams
): Promise<PaginatedData<AlertEvent>> {
  const cleanParams: Record<string, string | number | boolean> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') {
      cleanParams[k] = v as string | number | boolean;
    }
  });
  return get<PaginatedData<AlertEvent>>('/alert-events', cleanParams);
}

export async function getAlert(id: string): Promise<AlertEvent> {
  return get<AlertEvent>(`/alert-events/${id}`);
}

export async function listActivities(id: string): Promise<AlertEventActivity[]> {
  return get<AlertEventActivity[]>(`/alert-events/${id}/activities`);
}

export async function listComments(id: string): Promise<AlertEventComment[]> {
  return get<AlertEventComment[]>(`/alert-events/${id}/comments`);
}

export async function acknowledgeAlert(id: string): Promise<AlertEvent> {
  return post<AlertEvent>(`/alert-events/${id}/acknowledge`);
}

export async function resolveAlert(
  id: string,
  resolutionNote?: string
): Promise<AlertEvent> {
  return post<AlertEvent>(`/alert-events/${id}/resolve`, {
    resolutionNote: resolutionNote?.trim() || undefined,
  });
}

export async function reopenAlert(id: string, note?: string): Promise<AlertEvent> {
  return post<AlertEvent>(`/alert-events/${id}/reopen`, {
    note: note?.trim() || undefined,
  });
}

export async function assignAlert(id: string, assignedToUserId: string): Promise<AlertEvent> {
  return post<AlertEvent>(`/alert-events/${id}/assign`, { assignedToUserId });
}

export async function unassignAlert(id: string): Promise<AlertEvent> {
  return post<AlertEvent>(`/alert-events/${id}/unassign`);
}

export async function addComment(
  id: string,
  type: 'COMMENT' | 'RESOLUTION_NOTE',
  body: string
): Promise<AlertEventComment> {
  return post<AlertEventComment>(`/alert-events/${id}/comments`, { type, body });
}

export interface BulkAcknowledgeResult {
  requested: number;
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{ alertEventId: string; success: boolean; error?: string }>;
}

export interface BulkResolveResult {
  requested: number;
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{ alertEventId: string; success: boolean; error?: string }>;
}

export async function bulkAcknowledgeAlerts(
  alertEventIds: string[]
): Promise<BulkAcknowledgeResult> {
  return post<BulkAcknowledgeResult>('/alert-events/bulk-acknowledge', {
    alertEventIds,
  });
}

export async function bulkResolveAlerts(
  alertEventIds: string[],
  resolutionNote?: string
): Promise<BulkResolveResult> {
  return post<BulkResolveResult>('/alert-events/bulk-resolve', {
    alertEventIds,
    resolutionNote: resolutionNote?.trim() || undefined,
  });
}
