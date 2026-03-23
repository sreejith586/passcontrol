import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { BulkAcknowledgeAlertsDto } from '../dto/bulk-acknowledge-alerts.dto';
import { BulkResolveAlertsDto } from '../dto/bulk-resolve-alerts.dto';
import { AssignAlertDto } from '../dto/assign-alert.dto';
import { AlertStatus } from '@prisma/client';
import { AlertEventsRepository } from '../repositories/alert-events.repository';
import { AlertSlaResolverService } from './alert-sla-resolver.service';
import { AlertEventActivitiesService } from '../../alert-event-activities/services/alert-event-activities.service';
import { AlertEventCommentsRepository } from '../../alert-event-comments/repositories/alert-event-comments.repository';
import { UsersService } from '../../users/services/users.service';
import { AlertEventCommentType } from '@prisma/client';
import { AlertEventStatus } from '../enums/alert-status.enum';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ListAlertEventsQueryDto } from '../dto/list-alert-events.dto';
import {
  AlertTrendsQueryDto,
  ALERT_TRENDS_INTERVALS,
} from '../dto/alert-trends-query.dto';
import { AlertEscalationsQueryDto } from '../dto/alert-escalations-query.dto';
import { AlertEscalationsPrioritizedQueryDto } from '../dto/alert-escalations-prioritized-query.dto';
import { AlertEscalationsSummaryQueryDto } from '../dto/alert-escalations-summary-query.dto';
import {
  AlertEscalationsTrendsQueryDto,
  ALERT_ESCALATIONS_TRENDS_INTERVALS,
} from '../dto/alert-escalations-trends-query.dto';
import { AlertSlaComplianceQueryDto } from '../dto/alert-sla-compliance-query.dto';
import {
  AlertInsightsSlaComplianceQueryDto,
  AlertInsightsEscalationTrendQueryDto,
  AlertInsightsTopSourcesQueryDto,
} from '../dto/alert-insights-query.dto';
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
    private readonly activities: AlertEventActivitiesService,
    private readonly commentsRepo: AlertEventCommentsRepository,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
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
    const createData = {
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
    };
    const created = await this.prisma.$transaction(async (tx) => {
      const alert = await this.repo.create(createData, tx);
      await this.activities.logCreated(payload.organizationId, alert.id, tx);
      return alert;
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

  async getSlaCompliance(
    ctx: { organizationId: string },
    query: AlertSlaComplianceQueryDto,
  ) {
    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      severity: query.severity,
      status: query.status,
      from: query.from,
      to: query.to,
    };
    const raw = await this.repo.getSlaCompliance(
      ctx.organizationId,
      filters,
      new Date(),
    );
    const ackEvaluated = raw.ackWithinSla + raw.ackBreached;
    const resEvaluated = raw.resWithinSla + raw.resBreached;
    return {
      totalAlerts: raw.totalAlerts,
      acknowledgment: {
        withinSla: raw.ackWithinSla,
        breached: raw.ackBreached,
        evaluated: ackEvaluated,
        complianceRate: ackEvaluated > 0 ? raw.ackWithinSla / ackEvaluated : null,
      },
      resolution: {
        withinSla: raw.resWithinSla,
        breached: raw.resBreached,
        evaluated: resEvaluated,
        complianceRate: resEvaluated > 0 ? raw.resWithinSla / resEvaluated : null,
      },
    };
  }

  async getSlaComplianceSummary(
    ctx: { organizationId: string },
    query: AlertInsightsSlaComplianceQueryDto,
  ) {
    const filters = { from: query.from, to: query.to };
    return this.repo.getSlaComplianceSummary(
      ctx.organizationId,
      filters,
      new Date(),
    );
  }

  async getEscalationTrend(
    ctx: { organizationId: string },
    query: AlertInsightsEscalationTrendQueryDto,
  ) {
    const days = Math.min(Math.max(query.days ?? 7, 1), 90);
    return this.repo.getEscalationTrend(ctx.organizationId, days, new Date());
  }

  async getTopProblemSources(
    ctx: { organizationId: string },
    query: AlertInsightsTopSourcesQueryDto,
  ) {
    const limit = Math.min(Math.max(query.limit ?? 5, 1), 20);
    return this.repo.getTopProblemSources(ctx.organizationId, limit);
  }

  async getEscalationsTrends(
    ctx: { organizationId: string },
    query: AlertEscalationsTrendsQueryDto,
  ) {
    const interval =
      query.interval && ALERT_ESCALATIONS_TRENDS_INTERVALS.includes(query.interval)
        ? query.interval
        : 'day';
    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      severity: query.severity,
      status: query.status,
      from: query.from,
      to: query.to,
    };
    const rows = await this.repo.getEscalationsTrends(
      ctx.organizationId,
      filters,
      interval,
      new Date(),
    );
    return {
      interval,
      points: rows.map((r) => ({
        date: r.date,
        alerts: {
          totalActiveAlerts: r.totalActiveAlerts,
          acknowledgeBreached: r.acknowledgeBreached,
          resolveBreached: r.resolveBreached,
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

  async getPrioritizedEscalations(
    ctx: { organizationId: string; userId?: string },
    query: AlertEscalationsPrioritizedQueryDto,
  ) {
    const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);
    const assignedToUserId = this.resolveAssignmentFilter(
      query.unassignedOnly,
      query.assignedToMe,
      query.assignedUserId,
      ctx.userId,
    );
    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      severity: query.severity,
      status: query.status,
      assignedToUserId,
    };
    const items = await this.repo.listPrioritizedEscalations(
      ctx.organizationId,
      filters,
      limit,
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
          acknowledgeOverdueMinutes: item.sla.acknowledgeOverdueMinutes,
          resolveOverdueMinutes: item.sla.resolveOverdueMinutes,
        },
        priority: item.priority,
      })),
    };
  }

  async getEscalations(
    ctx: { organizationId: string; userId?: string },
    query: AlertEscalationsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const pagination = { page, limit };
    const assignedToUserId = this.resolveAssignmentFilter(
      query.unassignedOnly,
      query.assignedToMe,
      query.assignedUserId,
      ctx.userId,
    );
    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      severity: query.severity,
      status: query.status,
      assignedToUserId,
      onlyBreached: query.onlyBreached === true,
    };
    const sort = query.sort && query.sort !== 'default' ? query.sort : undefined;
    const { items, total } = await this.repo.listEscalations(
      ctx.organizationId,
      filters,
      pagination,
      new Date(),
      sort,
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
        assignedToUser: item.assignedToUser,
        checklistName: item.checklistName,
        itemLabel: item.itemLabel,
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

  /**
   * List activity timeline for an alert. Enforces organizationId scoping.
   */
  async listActivities(
    ctx: { organizationId: string },
    id: string,
  ) {
    return this.activities.listForAlert(ctx.organizationId, id);
  }

  async list(
    ctx: { organizationId: string; userId?: string },
    query: ListAlertEventsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const pagination = { page, limit };
    const sort = query.sort ?? 'triggered_at_desc';

    const assignedToUserId = this.resolveAssignmentFilter(
      query.unassignedOnly,
      query.assignedToMe,
      query.assignedUserId,
      ctx.userId,
    );

    const { items, total } = await this.repo.list(ctx.organizationId, {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      assetId: query.assetId,
      type: query.type,
      status: query.status,
      severity: query.severity,
      sourceType: query.sourceType,
      assignedToUserId,
      from: query.from,
      to: query.to,
      pagination,
      sort,
    });

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
    const updated = await this.prisma.$transaction(async (tx) => {
      const alert = await this.repo.update(ctx.organizationId, id, {
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
        acknowledgedByUserId: ctx.userId ?? null,
      }, tx);
      await this.activities.logAcknowledged(
        ctx.organizationId,
        id,
        AlertStatus.OPEN,
        AlertStatus.ACKNOWLEDGED,
        ctx.userId ?? null,
        tx,
      );
      return alert;
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

  /**
   * Bulk acknowledge alerts. Delegates to acknowledge() for each ID.
   * Partial success: one failure does not fail the batch.
   */
  async bulkAcknowledge(
    ctx: { organizationId: string; userId?: string },
    dto: BulkAcknowledgeAlertsDto,
  ): Promise<{
    requested: number;
    processed: number;
    succeeded: number;
    failed: number;
    results: Array<{ alertEventId: string; success: boolean; error?: string }>;
  }> {
    const requested = dto.alertEventIds.length;
    const deduplicatedIds = [...new Set(dto.alertEventIds)];
    const results: Array<{ alertEventId: string; success: boolean; error?: string }> = [];
    let succeeded = 0;
    let failed = 0;

    for (const id of deduplicatedIds) {
      try {
        await this.acknowledge(ctx, id);
        results.push({ alertEventId: id, success: true });
        succeeded++;
      } catch (err) {
        const error = this.toBulkError(err);
        results.push({ alertEventId: id, success: false, error });
        failed++;
      }
    }

    return {
      requested,
      processed: deduplicatedIds.length,
      succeeded,
      failed,
      results,
    };
  }

  /**
   * Bulk resolve alerts. Delegates to resolve() for each ID.
   * Partial success: one failure does not fail the batch.
   */
  async bulkResolve(
    ctx: { organizationId: string; userId?: string },
    dto: BulkResolveAlertsDto,
  ): Promise<{
    requested: number;
    processed: number;
    succeeded: number;
    failed: number;
    results: Array<{ alertEventId: string; success: boolean; error?: string }>;
  }> {
    const requested = dto.alertEventIds.length;
    const deduplicatedIds = [...new Set(dto.alertEventIds)];
    const resolutionNote = dto.resolutionNote?.trim() || undefined;
    const requireResolutionNote =
      await this.getRequireResolutionNoteOnResolve(ctx.organizationId);
    const results: Array<{ alertEventId: string; success: boolean; error?: string }> = [];
    let succeeded = 0;
    let failed = 0;

    for (const id of deduplicatedIds) {
      try {
        await this.resolve(ctx, id, resolutionNote, {
          requireResolutionNote,
        });
        results.push({ alertEventId: id, success: true });
        succeeded++;
      } catch (err) {
        const error = this.toBulkError(err);
        results.push({ alertEventId: id, success: false, error });
        failed++;
      }
    }

    return {
      requested,
      processed: deduplicatedIds.length,
      succeeded,
      failed,
      results,
    };
  }

  /**
   * Resolve assignment filter from query params.
   * Precedence: unassignedOnly > assignedToMe > assignedUserId.
   */
  private resolveAssignmentFilter(
    unassignedOnly?: boolean,
    assignedToMe?: boolean,
    assignedUserId?: string,
    userId?: string,
  ): string | null | undefined {
    if (unassignedOnly === true) return null;
    if (assignedToMe === true && userId) return userId;
    if (assignedUserId) return assignedUserId;
    return undefined;
  }

  async assign(
    ctx: { organizationId: string; userId?: string },
    id: string,
    dto: AssignAlertDto,
  ) {
    const existing = await this.getById(ctx, id);
    if (existing.status === AlertEventStatus.RESOLVED) {
      throw new BadRequestException('Cannot assign a resolved alert');
    }
    const belongsToOrg = await this.usersService.belongsToOrganization(
      dto.assignedToUserId,
      ctx.organizationId,
    );
    if (!belongsToOrg) {
      throw new BadRequestException(
        'Target user not found or does not belong to this organization',
      );
    }
    const fromAssignedToUserId = existing.assignedToUserId ?? null;
    const updated = await this.prisma.$transaction(async (tx) => {
      const alert = await this.repo.assign(
        ctx.organizationId,
        id,
        dto.assignedToUserId,
        ctx.userId ?? null,
        tx,
      );
      await this.activities.logAssignmentChanged(
        ctx.organizationId,
        id,
        fromAssignedToUserId,
        dto.assignedToUserId,
        ctx.userId ?? null,
        tx,
      );
      return alert;
    });
    await this.audit.recordWrite('ALERT_ASSIGN', ctx, id, {
      before: existing,
      after: updated,
    });
    return this.toAssignmentResponse(updated!);
  }

  async unassign(ctx: { organizationId: string; userId?: string }, id: string) {
    const existing = await this.getById(ctx, id);
    if (existing.status === AlertEventStatus.RESOLVED) {
      throw new BadRequestException('Cannot unassign a resolved alert');
    }
    const fromAssignedToUserId = existing.assignedToUserId ?? null;
    const updated = await this.prisma.$transaction(async (tx) => {
      const alert = await this.repo.unassign(ctx.organizationId, id, tx);
      await this.activities.logAssignmentChanged(
        ctx.organizationId,
        id,
        fromAssignedToUserId,
        null,
        ctx.userId ?? null,
        tx,
      );
      return alert;
    });
    await this.audit.recordWrite('ALERT_UNASSIGN', ctx, id, {
      before: existing,
      after: updated,
    });
    return this.toAssignmentResponse(updated!);
  }

  private toAssignmentResponse(alert: {
    id: string;
    status: string;
    assignedToUserId: string | null;
    assignedAt: Date | null;
    assignedByUserId: string | null;
    assignedToUser?: { id: string; name: string } | null;
  }) {
    return {
      id: alert.id,
      status: alert.status,
      assignedToUserId: alert.assignedToUserId,
      assignedAt: alert.assignedAt?.toISOString() ?? null,
      assignedByUserId: alert.assignedByUserId,
      assignedToUser: alert.assignedToUser
        ? { id: alert.assignedToUser.id, name: alert.assignedToUser.name }
        : null,
    };
  }

  private async getRequireResolutionNoteOnResolve(
    organizationId: string,
  ): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { requireResolutionNoteOnResolve: true },
    });
    return org?.requireResolutionNoteOnResolve ?? false;
  }

  private async getRequireReopenNoteOnReopen(
    organizationId: string,
  ): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { requireReopenNoteOnReopen: true },
    });
    return org?.requireReopenNoteOnReopen ?? false;
  }

  private toBulkError(err: unknown): string {
    if (err instanceof NotFoundException) return 'Alert not found';
    if (err instanceof BadRequestException) {
      const msg = (err as BadRequestException).message;
      if (msg?.includes('already acknowledged')) return 'Alert already acknowledged';
      if (msg?.includes('already resolved')) return 'Alert already resolved';
      if (msg?.includes('Only OPEN')) return 'Alert already acknowledged';
      if (msg?.includes('Resolution note is required'))
        return 'Resolution note is required';
      return msg ?? 'Bad request';
    }
    return err instanceof Error ? err.message : 'Unknown error';
  }

  async resolve(
    ctx: { organizationId: string; userId?: string },
    id: string,
    resolutionNote?: string,
    options?: { requireResolutionNote?: boolean },
  ) {
    const existing = await this.getById(ctx, id);
    if (existing.status === AlertEventStatus.RESOLVED) {
      throw new BadRequestException('Alert is already resolved');
    }

    const requireNote =
      options?.requireResolutionNote ??
      (await this.getRequireResolutionNoteOnResolve(ctx.organizationId));
    const resolutionNoteTrimmed = resolutionNote?.trim() || null;

    if (requireNote && !resolutionNoteTrimmed) {
      throw new BadRequestException(
        'Resolution note is required when resolving alerts for this organization',
      );
    }

    const fromStatus = existing.status as AlertStatus;
    const updated = await this.prisma.$transaction(async (tx) => {
      const alert = await this.repo.update(ctx.organizationId, id, {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedByUserId: ctx.userId ?? null,
        resolutionNote: resolutionNoteTrimmed,
      }, tx);
      await this.activities.logResolved(
        ctx.organizationId,
        id,
        fromStatus,
        AlertStatus.RESOLVED,
        ctx.userId ?? null,
        alert?.resolutionNote ?? null,
        tx,
      );
      return alert;
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

  /**
   * Reopen a RESOLVED alert. Transitions to OPEN. Preserves assignment and SLA snapshot.
   * When requireReopenNoteOnReopen is true, a non-empty note is required (stored as REOPEN_NOTE comment).
   */
  async reopen(
    ctx: { organizationId: string; userId?: string },
    id: string,
    note?: string,
  ) {
    const existing = await this.getById(ctx, id);
    if (existing.status !== AlertEventStatus.RESOLVED) {
      throw new BadRequestException('Only RESOLVED alerts can be reopened');
    }

    const requireNote = await this.getRequireReopenNoteOnReopen(ctx.organizationId);
    const noteTrimmed = note?.trim() || null;

    if (requireNote && !noteTrimmed) {
      throw new BadRequestException(
        'Reopen note is required when reopening alerts for this organization',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const alert = await this.repo.update(ctx.organizationId, id, {
        status: AlertStatus.OPEN,
        acknowledgedAt: null,
        acknowledgedByUserId: null,
        resolvedAt: null,
        resolvedByUserId: null,
        resolutionNote: null,
      }, tx);
      await this.activities.logReopened(
        ctx.organizationId,
        id,
        ctx.userId ?? null,
        tx,
      );
      if (noteTrimmed) {
        await this.commentsRepo.create(
          {
            organizationId: ctx.organizationId,
            alertEventId: id,
            authorUserId: ctx.userId ?? null,
            type: AlertEventCommentType.REOPEN_NOTE,
            body: noteTrimmed,
          },
          tx,
        );
      }
      return alert;
    });
    await this.audit.recordWrite('ALERT_REOPEN', ctx, id, {
      before: existing,
      after: updated,
    });
    return updated;
  }
}
