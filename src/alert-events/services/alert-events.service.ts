import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { AlertStatus } from '@prisma/client';
import { AlertEventsRepository } from '../repositories/alert-events.repository';
import { AlertSlaResolverService } from './alert-sla-resolver.service';
import { AlertEventStatus } from '../enums/alert-status.enum';
import { ListAlertEventsQueryDto } from '../dto/list-alert-events.dto';
import {
  AlertTrendsQueryDto,
  ALERT_TRENDS_INTERVALS,
} from '../dto/alert-trends-query.dto';
import { AlertEscalationsQueryDto } from '../dto/alert-escalations-query.dto';
import { AlertEscalationsSummaryQueryDto } from '../dto/alert-escalations-summary-query.dto';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEventPublisher,
} from '../../common/domain-events/contracts/domain-event-publisher.interface';
import {
  createAlertAcknowledgedEvent,
} from '../../common/domain-events/events/alert-acknowledged.event';
import {
  createAlertResolvedEvent,
} from '../../common/domain-events/events/alert-resolved.event';

@Injectable()
export class AlertEventsService {
  constructor(
    private readonly repo: AlertEventsRepository,
    private readonly slaResolver: AlertSlaResolverService,
    private readonly audit: AuditLogsService,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly domainEvents: DomainEventPublisher,
  ) {}

  /**
   * Called by TemperatureReadingsService (or other sources) when a breach/event occurs.
   * Payload is stored as-is for traceability. Resolves SLA at creation time.
   */
  async createFromPayload(payload: {
    organizationId: string;
    sourceType: string;
    sourceId: string;
    type: string;
    scope: { brandId?: string; locationId?: string; zoneId?: string; assetId?: string };
    payload: Record<string, unknown>;
    severity?: string;
    triggeredAt?: Date;
  }) {
    const triggeredAt = payload.triggeredAt ?? new Date();
    const sla = await this.slaResolver.resolve({
      organizationId: payload.organizationId,
      brandId: payload.scope.brandId ?? null,
      locationId: payload.scope.locationId ?? null,
      zoneId: payload.scope.zoneId ?? null,
      severity: payload.severity ?? 'MEDIUM',
    });
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
      acknowledgeWithinMinutes: sla.acknowledgeWithinMinutes,
      resolveWithinMinutes: sla.resolveWithinMinutes,
      payloadJson: payload.payload,
      triggeredAt,
    });
    return created;
  }

  async getTrends(ctx: { organizationId: string }, query: AlertTrendsQueryDto) {
    const interval =
      query.interval && ALERT_TRENDS_INTERVALS.includes(query.interval)
        ? query.interval
        : 'day';
    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      severity: query.severity,
      from: query.from,
      to: query.to,
    };
    const rows = await this.repo.getTrends(
      ctx.organizationId,
      filters,
      interval,
    );
    return {
      interval,
      points: rows.map((r) => ({
        date: r.date,
        alerts: {
          created: r.created,
          acknowledged: r.acknowledged,
          resolved: r.resolved,
        },
      })),
    };
  }

  async getEscalationsSummary(
    ctx: { organizationId: string },
    query: AlertEscalationsSummaryQueryDto,
  ) {
    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      severity: query.severity,
      status: query.status,
    };
    return this.repo.getEscalationsSummary(
      ctx.organizationId,
      filters,
      new Date(),
    );
  }

  async getEscalationsSummaryByLocation(
    ctx: { organizationId: string },
    query: AlertEscalationsSummaryQueryDto,
  ) {
    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      severity: query.severity,
      status: query.status,
    };
    return this.repo.getEscalationsSummaryByLocation(
      ctx.organizationId,
      filters,
      new Date(),
    );
  }

  async getEscalations(
    ctx: { organizationId: string },
    query: AlertEscalationsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const pagination = { page, limit };
    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      severity: query.severity,
      status: query.status,
      onlyBreached: query.onlyBreached === true,
    };
    const { items, total } = await this.repo.listEscalations(
      ctx.organizationId,
      filters,
      pagination,
      new Date(),
    );
    return {
      items: items.map((item) => ({
        alertEventId: item.alertEventId,
        severity: item.severity,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        acknowledgedAt: item.acknowledgedAt?.toISOString() ?? null,
        resolvedAt: item.resolvedAt?.toISOString() ?? null,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        scope: item.scope,
        sla: {
          acknowledgeWithinMinutes: item.sla.acknowledgeWithinMinutes,
          resolveWithinMinutes: item.sla.resolveWithinMinutes,
          acknowledgeBy: item.sla.acknowledgeBy.toISOString(),
          resolveBy: item.sla.resolveBy.toISOString(),
          acknowledgeBreached: item.sla.acknowledgeBreached,
          resolveBreached: item.sla.resolveBreached,
        },
      })),
      total,
      page,
      limit,
    };
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

  /**
   * Returns counts for supervisor dashboard metrics (open, acknowledged, resolved today).
   */
  async getMetricsCounts(
    organizationId: string,
    filters: { brandId?: string; locationId?: string; zoneId?: string },
    resolvedTodayRange: { start: Date; end: Date },
  ): Promise<{ open: number; acknowledged: number; resolvedToday: number }> {
    const [open, acknowledged, resolvedToday] = await Promise.all([
      this.repo.countByStatus(organizationId, filters, AlertStatus.OPEN),
      this.repo.countByStatus(organizationId, filters, AlertStatus.ACKNOWLEDGED),
      this.repo.countResolvedInRange(organizationId, filters, resolvedTodayRange),
    ]);
    return { open, acknowledged, resolvedToday };
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
    if (updated) {
      const event = createAlertAcknowledgedEvent(ctx.organizationId, {
        alertEventId: updated.id,
        sourceType: updated.sourceType,
        sourceId: updated.sourceId,
        acknowledgedByUserId: updated.acknowledgedByUserId ?? null,
        severity: updated.severity ?? null,
        status: updated.status,
        acknowledgedAt: updated.acknowledgedAt!,
        brandId: updated.brandId ?? null,
        locationId: updated.locationId ?? null,
        zoneId: updated.zoneId ?? null,
      });
      await this.domainEvents.publish(event);
    }
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
    if (updated) {
      const event = createAlertResolvedEvent(ctx.organizationId, {
        alertEventId: updated.id,
        sourceType: updated.sourceType,
        sourceId: updated.sourceId,
        resolvedByUserId: updated.resolvedByUserId ?? null,
        severity: updated.severity ?? null,
        status: updated.status,
        resolvedAt: updated.resolvedAt!,
        resolutionNote: updated.resolutionNote ?? null,
        brandId: updated.brandId ?? null,
        locationId: updated.locationId ?? null,
        zoneId: updated.zoneId ?? null,
      });
      await this.domainEvents.publish(event);
    }
    await this.audit.recordWrite('ALERT_RESOLVE', ctx, id, {
      before: existing,
      after: updated,
    });
    return updated;
  }
}
