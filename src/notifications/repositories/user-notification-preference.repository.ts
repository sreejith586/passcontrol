import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface PreferenceRow {
  id: string;
  notificationType: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  whatsAppEnabled: boolean;
}

@Injectable()
export class UserNotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndOrg(
    userId: string,
    organizationId: string,
  ): Promise<PreferenceRow[]> {
    const rows = await this.prisma.userNotificationPreference.findMany({
      where: { userId, organizationId },
      select: {
        id: true,
        notificationType: true,
        inAppEnabled: true,
        emailEnabled: true,
        whatsAppEnabled: true,
      },
    });
    return rows;
  }

  async upsert(
    userId: string,
    organizationId: string,
    notificationType: NotificationType,
    data: { inAppEnabled: boolean; emailEnabled: boolean; whatsAppEnabled: boolean },
  ): Promise<PreferenceRow> {
    const row = await this.prisma.userNotificationPreference.upsert({
      where: {
        userId_organizationId_notificationType: {
          userId,
          organizationId,
          notificationType,
        },
      },
      create: {
        userId,
        organizationId,
        notificationType,
        ...data,
      },
      update: data,
      select: {
        id: true,
        notificationType: true,
        inAppEnabled: true,
        emailEnabled: true,
        whatsAppEnabled: true,
      },
    });
    return row;
  }
}
