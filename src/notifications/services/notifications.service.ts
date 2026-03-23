import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, NotificationSourceType } from '@prisma/client';
import { NotificationsRepository } from '../repositories/notifications.repository';
import type { TenantContext } from '../../access/decorators/current-tenant.decorator';

export interface CreateNotificationInput {
  type: NotificationType;
  userIds: string[];
  sourceType: NotificationSourceType;
  sourceId: string;
  payload: Record<string, unknown>;
  dedupeKey?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  /**
   * Create notifications for the given users. Skips inserts if dedupeKey
   * already exists. Caller must pass organizationId for tenant scoping.
   */
  async createNotification(
    organizationId: string,
    input: CreateNotificationInput,
  ): Promise<void> {
    for (const userId of input.userIds) {
      const dedupeKey = input.dedupeKey ?? null;
      if (dedupeKey) {
        const existing = await this.repo.findByDedupeKey(dedupeKey);
        if (existing) continue;
      }

      await this.repo.create({
        organizationId,
        userId,
        type: input.type,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        payloadJson: input.payload,
        dedupeKey,
      });
    }
  }

  async list(
    ctx: TenantContext,
    query: { page?: number; limit?: number; unreadOnly?: boolean },
  ) {
    const userId = ctx.userId;
    if (!userId) {
      return { items: [], total: 0, page: 1, limit: 25, unreadCount: 0 };
    }

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 25));

    const { items, total } = await this.repo.listByUser(
      ctx.organizationId,
      userId,
      { page, limit },
      query.unreadOnly,
    );

    const unreadCount = await this.repo.unreadCount(
      ctx.organizationId,
      userId,
    );

    return {
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        sourceType: n.sourceType,
        sourceId: n.sourceId,
        payload: n.payloadJson as Record<string, unknown>,
        createdAt: n.createdAt.toISOString(),
        readAt: n.readAt?.toISOString() ?? null,
      })),
      total,
      page,
      limit,
      unreadCount,
    };
  }

  async getUnreadCount(ctx: TenantContext): Promise<number> {
    if (!ctx.userId) return 0;
    return this.repo.unreadCount(ctx.organizationId, ctx.userId);
  }

  async markRead(ctx: TenantContext, id: string): Promise<void> {
    if (!ctx.userId) return;
    const result = await this.repo.markRead(
      ctx.organizationId,
      ctx.userId,
      id,
    );
    if (result.count === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  async markAllRead(ctx: TenantContext): Promise<{ count: number }> {
    if (!ctx.userId) return { count: 0 };
    const result = await this.repo.markAllRead(
      ctx.organizationId,
      ctx.userId,
    );
    return { count: result.count };
  }
}
