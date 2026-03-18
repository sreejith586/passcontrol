import { Injectable } from '@nestjs/common';
import { AlertEventActivityType, AlertStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface CreateAlertEventActivityInput {
  organizationId: string;
  alertEventId: string;
  type: AlertEventActivityType;
  actorUserId?: string | null;
  fromStatus?: AlertStatus | null;
  toStatus?: AlertStatus | null;
  fromAssignedToUserId?: string | null;
  toAssignedToUserId?: string | null;
  comment?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

@Injectable()
export class AlertEventActivitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateAlertEventActivityInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = (tx ?? this.prisma) as Prisma.TransactionClient;
    return client.alertEventActivity.create({
      data: {
        organizationId: data.organizationId,
        alertEventId: data.alertEventId,
        type: data.type,
        actorUserId: data.actorUserId ?? null,
        fromStatus: data.fromStatus ?? null,
        toStatus: data.toStatus ?? null,
        fromAssignedToUserId: data.fromAssignedToUserId ?? null,
        toAssignedToUserId: data.toAssignedToUserId ?? null,
        comment: data.comment ?? null,
        metadata:
          data.metadata === undefined
            ? undefined
            : data.metadata === null
              ? Prisma.JsonNull
              : (data.metadata as Prisma.InputJsonValue),
      },
    });
  }

  async findByAlertId(
    organizationId: string,
    alertEventId: string,
  ): Promise<
    Array<{
      id: string;
      type: string;
      actorUserId: string | null;
      fromStatus: string | null;
      toStatus: string | null;
      fromAssignedToUserId: string | null;
      toAssignedToUserId: string | null;
      comment: string | null;
      metadata: unknown;
      createdAt: Date;
    }>
  > {
    const rows = await this.prisma.alertEventActivity.findMany({
      where: { organizationId, alertEventId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        actorUserId: true,
        fromStatus: true,
        toStatus: true,
        fromAssignedToUserId: true,
        toAssignedToUserId: true,
        comment: true,
        metadata: true,
        createdAt: true,
      },
    });
    return rows;
  }
}
