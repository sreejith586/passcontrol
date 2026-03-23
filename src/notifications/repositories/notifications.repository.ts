import { Injectable } from '@nestjs/common';
import {
  NotificationType,
  NotificationSourceType,
} from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface CreateNotificationInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  sourceType: NotificationSourceType;
  sourceId: string;
  payloadJson: Record<string, unknown>;
  dedupeKey?: string | null;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        type: data.type,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        payloadJson: data.payloadJson as object,
        dedupeKey: data.dedupeKey ?? null,
      },
    });
  }

  async findByDedupeKey(dedupeKey: string) {
    return this.prisma.notification.findUnique({
      where: { dedupeKey },
      select: { id: true },
    });
  }

  async listByUser(
    organizationId: string,
    userId: string,
    pagination: { page: number; limit: number },
    unreadOnly?: boolean,
  ) {
    const where: { organizationId: string; userId: string; readAt?: null } = {
      organizationId,
      userId,
    };
    if (unreadOnly) {
      where.readAt = null;
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        select: {
          id: true,
          type: true,
          sourceType: true,
          sourceId: true,
          payloadJson: true,
          createdAt: true,
          readAt: true,
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total };
  }

  async unreadCount(organizationId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        organizationId,
        userId,
        readAt: null,
      },
    });
  }

  async markRead(
    organizationId: string,
    userId: string,
    id: string,
  ) {
    return this.prisma.notification.updateMany({
      where: { id, organizationId, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(organizationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { organizationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
