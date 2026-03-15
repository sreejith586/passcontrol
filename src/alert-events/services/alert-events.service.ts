import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AlertStatus } from '@prisma/client';
import { AlertEventsRepository } from '../repositories/alert-events.repository';
import { ListAlertEventsQueryDto } from '../dto/list-alert-events.dto';
import { AlertEventStatus } from '../enums/alert-status.enum';
import { AuditLogsService } from '../../audit/services/audit-logs.service';

@Injectable()
export class AlertEventsService {
  constructor(
    private readonly repo: AlertEventsRepository,
    private readonly audit: AuditLogsService,
  ) {}

  /**
   * Called by TemperatureReadingsService (or other sources) when a breach/event occurs.
   * Payload is stored as-is for traceability.
   */
  async createFromPayload(payload: {
    organizationId: string;
    sourceType: string;
    sourceId: string;
    type: string;
    scope: { brandId?: string; locationId?: string; zoneId?: string; assetId?: string };
    payload: Record<string, unknown>;
    severity?: string;
  }) {
    const triggeredAt = new Date();
    const created = await this.repo.create({
      organizationId: payload.organizationId,
      brandId: payload.scope.brandId ?? null,
      locationId: payload.scope.locationId ?? null,
      zoneId: payload.scope.zoneId ?? null,
      assetId: payload.scope.assetId ?? null,
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      type: payload.type,
      status: AlertEventStatus.OPEN,
      severity: payload.severity ?? null,
      payloadJson: payload.payload,
      triggeredAt,
    });
    return created;
  }

  async getById(ctx: { organizationId: string }, id: string) {
    const alert = await this.repo.findById(ctx.organizationId, id);
    if (!alert) throw new NotFoundException('Alert event not found');
    return alert;
  }

  async list(ctx: { organizationId: string }, query: ListAlertEventsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const pagination = { page, limit };
    const sort =
      query.sort === 'triggered_at_asc'
        ? { triggeredAt: 'asc' as const }
        : query.sort === 'triggered_at_desc'
        ? { triggeredAt: 'desc' as const }
        : { createdAt: 'desc' as const };

    const { items, total } = await this.repo.list(
      ctx.organizationId,
      {
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
        assetId: query.assetId,
        type: query.type,
        status: query.status,
        severity: query.severity,
        sourceType: query.sourceType,
        from: query.from,
        to: query.to,
      },
      pagination,
      sort,
    );

    return { items, total, page, limit };
  }

  async acknowledge(ctx: { organizationId: string; userId?: string }, id: string) {
    const existing = await this.getById(ctx, id);
    if (existing.status !== AlertEventStatus.OPEN) {
      throw new BadRequestException('Only OPEN alerts can be acknowledged');
    }
    const updated = await this.repo.update(ctx.organizationId, id, {
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date(),
      acknowledgedByUserId: ctx.userId ?? null,
    });
    await this.audit.recordWrite('ALERT_ACKNOWLEDGE', ctx, id, {
      before: existing,
      after: updated,
    });
    return updated;
  }

  async resolve(
    ctx: { organizationId: string; userId?: string },
    id: string,
    resolutionNote?: string,
  ) {
    const existing = await this.getById(ctx, id);
    if (existing.status === AlertEventStatus.RESOLVED) {
      throw new BadRequestException('Alert is already resolved');
    }
    const updated = await this.repo.update(ctx.organizationId, id, {
      status: AlertStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedByUserId: ctx.userId ?? null,
      resolutionNote: resolutionNote?.trim() || null,
    });
    await this.audit.recordWrite('ALERT_RESOLVE', ctx, id, {
      before: existing,
      after: updated,
    });
    return updated;
  }
}
