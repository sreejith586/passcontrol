export const queryKeys = {
  all: ['brands'] as const,
  list: () => ['brands', 'list'] as const,
  detail: (id: string) => ['brands', 'detail', id] as const,
};
