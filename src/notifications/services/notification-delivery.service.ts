import { Injectable } from '@nestjs/common';
import { DeliveryChannel, DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationDeliveryRepository } from '../repositories/notification-delivery.repository';
import { EmailChannelService } from '../mail/email-channel.service';

export interface CreatedNotification {
  id: string;
  userId: string;
  organizationId: string;
  type: import('@prisma/client').NotificationType;
  payload: Record<string, unknown>;
}

@Injectable()
export class NotificationDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly preferences: NotificationPreferencesService,
    private readonly deliveryRepo: NotificationDeliveryRepository,
    private readonly emailChannel: EmailChannelService,
  ) {}

  /**
   * Process delivery for created notifications.
   * - IN_APP: always recorded as SENT (notification row is the in-app delivery)
   * - EMAIL: sent if user preference emailEnabled and user has email
   */
  async deliver(notifications: CreatedNotification[]): Promise<void> {
    for (const n of notifications) {
      await this.deliverOne(n);
    }
  }

  private async deliverOne(n: CreatedNotification): Promise<void> {
    const prefs = await this.preferences.getEffectivePreferencesForUser(
      n.userId,
      n.organizationId,
    );
    const pref = prefs.find((p) => p.notificationType === n.type) ?? {
      notificationType: n.type,
      inAppEnabled: true,
      emailEnabled: true,
      whatsAppEnabled: false,
    };

    await this.deliveryRepo.create({
      notificationId: n.id,
      organizationId: n.organizationId,
      userId: n.userId,
      channel: DeliveryChannel.IN_APP,
      status: DeliveryStatus.SENT,
      recipient: 'in-app',
    });

    if (pref.emailEnabled) {
      const user = await this.prisma.user.findUnique({
        where: { id: n.userId },
        select: { email: true },
      });
      if (user?.email?.trim()) {
        const delivery = await this.deliveryRepo.create({
          notificationId: n.id,
          organizationId: n.organizationId,
          userId: n.userId,
          channel: DeliveryChannel.EMAIL,
          status: DeliveryStatus.PENDING,
          recipient: user.email,
        });

        const result = await this.emailChannel.send(
          user.email,
          n.type,
          n.payload as Record<string, unknown>,
          { organizationId: n.organizationId },
        );

        if (result.success) {
          await this.deliveryRepo.updateStatus(delivery.id, {
            status: DeliveryStatus.SENT,
            sentAt: new Date(),
            providerMessageId: result.messageId ?? null,
          });
        } else {
          await this.deliveryRepo.updateStatus(delivery.id, {
            status: DeliveryStatus.FAILED,
            errorMessage: result.error,
          });
        }
      } else {
        await this.deliveryRepo.create({
          notificationId: n.id,
          organizationId: n.organizationId,
          userId: n.userId,
          channel: DeliveryChannel.EMAIL,
          status: DeliveryStatus.SKIPPED,
          recipient: '(no email)',
        });
      }
    } else {
      await this.deliveryRepo.create({
        notificationId: n.id,
        organizationId: n.organizationId,
        userId: n.userId,
        channel: DeliveryChannel.EMAIL,
        status: DeliveryStatus.SKIPPED,
        recipient: '(preference off)',
      });
    }
  }
}
