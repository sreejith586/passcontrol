export const queryKeys = {
  all: ['checklist-schedules'] as const,
  list: (params?: {
    checklistTemplateId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) => ['checklist-schedules', 'list', params ?? {}] as const,
  detail: (id: string) => ['checklist-schedules', 'detail', id] as const,
};
