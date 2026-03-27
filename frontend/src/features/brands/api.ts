import { get, post, patch } from '@/core/api/client';

export interface Brand {
  id: string;
  organizationId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export async function listBrands(): Promise<Brand[]> {
  return get<Brand[]>('/v1/brands');
}

export async function getBrandById(id: string): Promise<Brand> {
  return get<Brand>(`/v1/brands/${id}`);
}

export async function createBrand(payload: { name: string }): Promise<Brand> {
  return post<Brand>('/v1/brands', payload);
}

export async function updateBrand(
  id: string,
  payload: { name?: string }
): Promise<Brand> {
  return patch<Brand>(`/v1/brands/${id}`, payload);
}
