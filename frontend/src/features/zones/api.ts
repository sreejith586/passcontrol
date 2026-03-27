import { get, post, patch } from '@/core/api/client';

export interface ZoneLocation {
  id: string;
  name: string;
}

export interface Zone {
  id: string;
  organizationId: string;
  locationId: string;
  location?: ZoneLocation;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export async function listZones(params?: {
  locationId?: string;
}): Promise<Zone[]> {
  const searchParams: Record<string, string> = {};
  if (params?.locationId) searchParams.locationId = params.locationId;
  return get<Zone[]>('/v1/zones', searchParams);
}

export async function getZoneById(id: string): Promise<Zone> {
  return get<Zone>(`/v1/zones/${id}`);
}

export async function createZone(payload: {
  locationId: string;
  name: string;
}): Promise<Zone> {
  return post<Zone>('/v1/zones', payload);
}

export async function updateZone(
  id: string,
  payload: { locationId?: string; name?: string }
): Promise<Zone> {
  return patch<Zone>(`/v1/zones/${id}`, payload);
}
