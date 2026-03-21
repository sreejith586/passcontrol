import { get, post, patch } from '@/core/api/client';

export interface LocationBrand {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  organizationId: string;
  brandId: string;
  brand?: LocationBrand;
  name: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export async function listLocations(params?: {
  brandId?: string;
}): Promise<Location[]> {
  const searchParams: Record<string, string> = {};
  if (params?.brandId) searchParams.brandId = params.brandId;
  return get<Location[]>('/locations', searchParams);
}

export async function getLocationById(id: string): Promise<Location> {
  return get<Location>(`/locations/${id}`);
}

export async function createLocation(payload: {
  brandId: string;
  name: string;
  timezone: string;
}): Promise<Location> {
  return post<Location>('/locations', payload);
}

export async function updateLocation(
  id: string,
  payload: { brandId?: string; name?: string; timezone?: string }
): Promise<Location> {
  return patch<Location>(`/locations/${id}`, payload);
}
