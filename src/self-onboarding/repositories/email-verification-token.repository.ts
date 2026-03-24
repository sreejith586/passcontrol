import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

const TOKEN_BYTES = 32;
const DEFAULT_EXPIRY_DAYS = 7;

/**
 * Email verification tokens (distinct from password setup / reset).
 * Stores SHA-256 hash; plain token returned once for the verification link.
 */
@Injectable()
export class EmailVerificationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  hashToken(plainToken: string): string {
    return crypto.createHash('sha256').update(plainToken).digest('hex');
  }

  /**
   * Lookup by stored hash with user for verification flows.
   */
  async findByTokenHashIncludingUser(tokenHash: string) {
    return this.prisma.emailVerificationToken.findFirst({
      where: { tokenHash },
      include: {
        user: true,
      },
    });
  }

  /**
   * Create a verification token inside a transaction.
   * @returns Plain token (single-use secret for the email link).
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    expiresInDays: number = DEFAULT_EXPIRY_DAYS,
  ): Promise<string> {
    const plainToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(plainToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await tx.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return plainToken;
  }
}
