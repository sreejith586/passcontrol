export class ApiResponse<T = unknown> {
  constructor(
    public success: boolean,
    public data?: T,
    public error?: unknown,
  ) {}

  static ok<T>(data: T) {
    return { success: true, data };
  }

  static created<T>(data: T) {
    return { success: true, data };
  }

  static fail(error: unknown) {
    return { success: false, error };
  }
}
