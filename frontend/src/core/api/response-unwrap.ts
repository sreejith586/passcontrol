import type { ApiResponseBody } from './types';

/**
 * Unwraps response from endpoints confirmed to use ApiResponse.ok(data).
 * Returns data or throws if shape is invalid.
 */
export function unwrapResponse<T>(response: unknown): T {
  if (response === null || typeof response !== 'object') {
    throw new Error('Invalid API response: expected object');
  }
  const body = response as ApiResponseBody<T>;
  if (body.success !== true || !('data' in body)) {
    throw new Error('Invalid API response: expected { success: true, data }');
  }
  return body.data;
}
