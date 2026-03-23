export type NotificationType = 'ESCALATION_ASSIGNED';
export type NotificationSourceType = 'CHECKLIST_RUN' | 'ALERT_EVENT';

export interface Notification {
  id: string;
  type: NotificationType;
  sourceType: NotificationSourceType;
  sourceId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationsListResponse {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
}
