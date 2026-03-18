import { Injectable } from '@nestjs/common';
import { AlertEventCommentType } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface CreateAlertEventCommentInput {
  organizationId: string;
  alertEventId: string;
  authorUserId: string;
  type: AlertEventCommentType;
  body: string;
}

@Injectable()
export class AlertEventCommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAlertEventCommentInput) {
    return this.prisma.alertEventComment.create({
      data: {
        organizationId: data.organizationId,
        alertEventId: data.alertEventId,
        authorUserId: data.authorUserId,
        type: data.type,
        body: data.body,
      },
    });
  }

  async findByAlertId(
    organizationId: string,
    alertEventId: string,
  ): Promise<
    Array<{
      id: string;
      authorUserId: string;
      type: string;
      body: string;
      createdAt: Date;
    }>
  > {
    const rows = await this.prisma.alertEventComment.findMany({
      where: { organizationId, alertEventId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        authorUserId: true,
        type: true,
        body: true,
        createdAt: true,
      },
    });
    return rows;
  }
}
