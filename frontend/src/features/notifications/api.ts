import { get, patch, put } from '@/core/api/client';
import type { NotificationsListResponse, NotificationType } from './types';

export type { NotificationType };

export interface NotificationPreferenceItem {
  notificationType: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  whatsAppEnabled: boolean;
}

export interface NotificationPreferencesResponse {
  items: NotificationPreferenceItem[];
}

export async function getNotificationPreferences(): Promise<NotificationPreferencesResponse> {
  return get<NotificationPreferencesResponse>('/notifications/preferences');
}

export async function putNotificationPreferences(
  items: NotificationPreferenceItem[]
): Promise<NotificationPreferencesResponse> {
  return put<NotificationPreferencesResponse>('/notifications/preferences', { items });
}

export async function getUnreadCount(): Promise<{ count: number }> {
  return get<{ count: number }>('/notifications/unread-count');
}

export async function listNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<NotificationsListResponse> {
  const clean: Record<string, string | number | boolean> = {};
  if (params?.page != null) clean.page = params.page;
  if (params?.limit != null) clean.limit = params.limit;
  if (params?.unreadOnly === true) clean.unreadOnly = true;
  return get<NotificationsListResponse>('/notifications', clean);
}

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  return patch<{ ok: boolean }>(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<{ count: number }> {
  return patch<{ count: number }>('/notifications/mark-all-read');
}
