export const queryKeys = {
  all: ['checklist-templates'] as const,
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    ['checklist-templates', 'list', params ?? {}] as const,
  detail: (id: string) => ['checklist-templates', 'detail', id] as const,
};
