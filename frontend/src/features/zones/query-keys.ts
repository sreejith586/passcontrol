export const queryKeys = {
  all: ['zones'] as const,
  list: (params?: { locationId?: string }) =>
    ['zones', 'list', params ?? {}] as const,
  detail: (id: string) => ['zones', 'detail', id] as const,
};
