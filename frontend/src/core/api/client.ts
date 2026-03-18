import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { unwrapResponse } from './response-unwrap';
import { ApiError } from './errors';

const baseURL =
  (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') + '/v1' || '/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let getToken: (() => string | null) | null = null;

export function setTokenGetter(fn: () => string | null): void {
  getToken = fn;
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(fn: () => void): void {
  onUnauthorized = fn;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    const message =
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      'Request failed';
    throw new ApiError(
      typeof message === 'string' ? message : 'Request failed',
      error.response?.status,
      error.response?.data
    );
  }
);

/**
 * GET with unwrap. Use for endpoints confirmed to return { success, data }.
 */
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get(url, { params });
  return unwrapResponse<T>(res.data);
}

/**
 * POST with unwrap.
 */
export async function post<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiClient.post(url, data);
  return unwrapResponse<T>(res.data);
}

/**
 * PATCH with unwrap.
 */
export async function patch<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiClient.patch(url, data);
  return unwrapResponse<T>(res.data);
}
