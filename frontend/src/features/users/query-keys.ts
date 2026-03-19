export const queryKeys = {
  users: {
    all: ['users'] as const,
    list: (params: { page?: number; limit?: number }) =>
      ['users', 'list', params] as const,
  },
  roles: {
    all: ['roles'] as const,
  },
} as const;
