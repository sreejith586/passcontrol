export const queryKeys = {
  notifications: {
    all: ['notifications'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
    list: (params?: { limit?: number }) =>
      ['notifications', 'list', params] as const,
  },
} as const;
