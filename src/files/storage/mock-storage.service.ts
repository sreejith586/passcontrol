import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import {
  StorageServiceInterface,
  UploadIntent,
} from './storage.interface';

const UPLOADS_BASE = process.env.UPLOADS_DIR ?? './uploads';

/**
 * MVP: Mock storage. Returns placeholder intent; writes bytes to local disk for multipart.
 * Replace with S3-compatible implementation later (e.g. presigned PUT).
 */
@Injectable()
export class MockStorageService implements StorageServiceInterface {
  private readonly defaultBucket = 'uploads-mock';

  async saveBytes(
    bucket: string,
    objectKey: string,
    buffer: Buffer,
    _contentType: string,
  ): Promise<void> {
    const fullPath = path.join(UPLOADS_BASE, bucket, objectKey);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, buffer);
  }

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
