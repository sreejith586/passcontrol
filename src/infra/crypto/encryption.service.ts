import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

/** Minimum length (UTF-8 chars) for ENCRYPTION_KEY. Aligned with AES-256 key material. */
export const ENCRYPTION_KEY_MIN_LENGTH = 32;

export const ENCRYPTION_KEY_ERROR_MESSAGE =
  'ENCRYPTION_KEY must be set and at least 32 characters. Generate one with: openssl rand -base64 32';

/** Validates ENCRYPTION_KEY at startup. Call from CryptoModule.onModuleInit(). */
export function validateEncryptionKeyConfig(): void {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || typeof secret !== 'string') {
    throw new Error(ENCRYPTION_KEY_ERROR_MESSAGE);
  }
  const trimmed = secret.trim();
  if (trimmed.length < ENCRYPTION_KEY_MIN_LENGTH) {
    throw new Error(ENCRYPTION_KEY_ERROR_MESSAGE);
  }
}

@Injectable()
export class EncryptionService {
  private key: Buffer | null = null;

  private getKey(): Buffer {
    if (!this.key) {
      validateEncryptionKeyConfig();
      const secret = process.env.ENCRYPTION_KEY!.trim();
      this.key = scryptSync(secret, 'org-email-salt', KEY_LENGTH);
    }
    return this.key;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.getKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, 'base64');
    if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid ciphertext');
    }
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.getKey(), iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }
}
