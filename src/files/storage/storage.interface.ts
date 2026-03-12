/**
 * Storage abstraction for file uploads.
 * MVP: local/mock; later: S3-compatible or presigned URLs.
 */
export const STORAGE_SERVICE = 'STORAGE_SERVICE';

export interface UploadIntent {
  /** Provider-specific upload URL or method (e.g. PUT URL for presigned). */
  uploadUrl?: string;
  /** Headers client should send (e.g. Content-Type). */
  headers?: Record<string, string>;
  /** Suggested object key in bucket. */
  objectKey: string;
  /** Bucket name. */
  bucket: string;
  /** Expiry if URL is time-limited (seconds). */
  expiresInSeconds?: number;
}

export interface StorageServiceInterface {
  /**
   * Generate upload intent for a new object. Client uploads to uploadUrl or uses key for direct PUT.
   * MVP: may return a local path or placeholder; actual bytes can be received later.
   */
  getUploadIntent(
    bucket: string,
    key: string,
    options?: { contentType?: string; maxSizeBytes?: number },
  ): Promise<UploadIntent>;

  /**
   * Register that upload completed (e.g. for local provider, move from temp to final key).
   * MVP: no-op or metadata-only if client posts file directly to backend.
   */
  confirmUpload?(bucket: string, key: string, sizeBytes: number): Promise<void>;

  /**
   * Delete object from storage.
   */
  deleteObject(bucket: string, key: string): Promise<void>;

  /**
   * Get a read URL for the object (signed or public). Optional for MVP.
   */
  getReadUrl?(bucket: string, key: string, expiresInSeconds?: number): Promise<string>;
}
