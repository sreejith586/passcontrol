/**
 * Backend uses ApiResponse.ok(data) → { success: true, data: T }
 * Paginated: data is { items, total, page, limit }
 */

export interface ApiResponseBody<T> {
  success: true;
  data: T;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
