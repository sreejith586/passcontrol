import { Injectable } from '@nestjs/common';
import {
  StorageServiceInterface,
  UploadIntent,
} from './storage.interface';

/**
 * MVP: Mock storage. Returns placeholder intent; no real bytes stored.
 * Replace with S3-compatible implementation later (e.g. presigned PUT).
 */
@Injectable()
export class MockStorageService implements StorageServiceInterface {
  private readonly defaultBucket = 'uploads-mock';

  async getUploadIntent(
    bucket: string,
    key: string,
    options?: { contentType?: string; maxSizeBytes?: number },
  ): Promise<UploadIntent> {
    return {
      objectKey: key,
      bucket: bucket || this.defaultBucket,
      headers: options?.contentType ? { 'Content-Type': options.contentType } : undefined,
      expiresInSeconds: 3600,
      // MVP: no uploadUrl; client may POST multipart to backend or use a separate upload endpoint
      uploadUrl: undefined,
    };
  }

  async confirmUpload(bucket: string, key: string, sizeBytes: number): Promise<void> {
    // No-op for mock
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    // No-op for mock
  }

  async getReadUrl(bucket: string, key: string): Promise<string> {
    return `mock://${bucket}/${key}`;
  }
}
