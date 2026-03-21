export const queryKeys = {
  all: ['locations'] as const,
  list: (params?: { brandId?: string }) =>
    ['locations', 'list', params ?? {}] as const,
  detail: (id: string) => ['locations', 'detail', id] as const,
};
