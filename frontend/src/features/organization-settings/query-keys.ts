export const queryKeys = {
  organizationSettings: {
    alertWorkflow: ['organization-settings', 'alert-workflow'] as const,
    regional: ['organization-settings', 'regional'] as const,
    email: ['settings', 'email'] as const,
    regionalResolved: (locationId?: string) =>
      ['organization-settings', 'regional-resolved', locationId ?? null] as const,
  },
} as const;
