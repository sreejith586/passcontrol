export interface TenantContext {
  requestId: string;
  userId?: string;
  organizationId?: string;
  brandId?: string;
  locationId?: string;
  roles?: string[];
  permissions?: string[];
  modules?: string[];
}
