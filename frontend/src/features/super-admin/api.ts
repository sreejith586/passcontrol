import { get } from '@/core/api/client';

export interface SuperAdminTenant {
  id: string;
  name: string;
  createdAt: string;
  isDemo: boolean;
  userCount: number;
  checklistRunCount: number;
  lastActivityAt: string;
}

export function listSuperAdminTenants(): Promise<SuperAdminTenant[]> {
  return get<SuperAdminTenant[]>('/super-admin/tenants');
}
