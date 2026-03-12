import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordWrite(
    action: string,
    ctx: { organizationId?: string; userId?: string },
    entityId: string,
    payload: { before?: unknown; after?: unknown },
  ) {
    await this.prisma.auditLog.create({
      data: {
        action,
        entityType: action.split('_').slice(0, -1).join('_') || 'ENTITY',
        entityId,
        organizationId: ctx.organizationId ?? null,
        actorId: ctx.userId ?? null,
        before: payload.before ? JSON.parse(JSON.stringify(payload.before)) : null,
        after: payload.after ? JSON.parse(JSON.stringify(payload.after)) : null,
      },
    });
  }

  async recordAuthEvent(action: string, payload: Record<string, unknown>) {
    await this.prisma.auditLog.create({
      data: {
        action,
        entityType: 'AUTH',
        entityId: (payload.userId as string) ?? (payload.email as string) ?? 'unknown',
        organizationId: (payload.organizationId as string) ?? null,
        actorId: (payload.userId as string) ?? null,
        after: payload ? JSON.parse(JSON.stringify(payload)) : null,
      },
    });
  }

  async recordAccessDenied(action: string, payload: Record<string, unknown>) {
    await this.prisma.auditLog.create({
      data: {
        action,
        entityType: 'ACCESS',
        entityId: (payload.userId as string) ?? 'unknown',
        organizationId: (payload.organizationId as string) ?? null,
        actorId: (payload.userId as string) ?? null,
        after: payload ? JSON.parse(JSON.stringify(payload)) : null,
      },
    });
  }
}
