import { Injectable } from '@nestjs/common';
import { DeliveryChannel, DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class NotificationDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    notificationId: string;
    organizationId: string;
    userId: string;
    channel: DeliveryChannel;
    status: DeliveryStatus;
    recipient: string;
    providerMessageId?: string | null;
    errorMessage?: string | null;
    sentAt?: Date | null;
  }) {
    return this.prisma.notificationDelivery.create({
      data: {
        notificationId: data.notificationId,
        organizationId: data.organizationId,
        userId: data.userId,
        channel: data.channel,
        status: data.status,
        recipient: data.recipient,
        providerMessageId: data.providerMessageId ?? null,
        errorMessage: data.errorMessage ?? null,
        sentAt: data.sentAt ?? null,
      },
    });
  }

  async updateStatus(
    id: string,
    data: { status: DeliveryStatus; errorMessage?: string | null; sentAt?: Date | null; providerMessageId?: string | null },
  ) {
    return this.prisma.notificationDelivery.update({
      where: { id },
      data,
    });
  }
}
