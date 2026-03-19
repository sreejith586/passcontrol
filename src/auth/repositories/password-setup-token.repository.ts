import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import * as crypto from 'crypto';

const TOKEN_BYTES = 32;
const DEFAULT_EXPIRY_DAYS = 7;

@Injectable()
export class PasswordSetupTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  hashToken(plainToken: string): string {
    return crypto.createHash('sha256').update(plainToken).digest('hex');
  }

  /**
   * Create a new setup token for the user.
   * Returns the plain token (to be shared once); stores only the hash.
   */
  async create(
    userId: string,
    expiresInDays: number = DEFAULT_EXPIRY_DAYS,
  ): Promise<string> {
    const plainToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(plainToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.prisma.passwordSetupToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return plainToken;
  }

  /**
   * Invalidate any prior unused tokens for the user by setting usedAt.
   */
  async invalidateUnusedByUserId(userId: string): Promise<void> {
    const now = new Date();
    await this.prisma.passwordSetupToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: now },
    });
  }

  /**
   * Find token by hash (for validation). Includes user for isActive check.
   */
  async findByTokenHash(tokenHash: string) {
    return this.prisma.passwordSetupToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });
  }

  /**
   * Mark token as used.
   */
  async markUsed(id: string): Promise<void> {
    await this.prisma.passwordSetupToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
