import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AlertSlaPolicyRepository } from '../repositories/alert-sla-policy.repository';
import { CreateAlertSlaPolicyDto } from '../dto/create-alert-sla-policy.dto';
import { UpdateAlertSlaPolicyDto } from '../dto/update-alert-sla-policy.dto';
import { ListAlertSlaPoliciesQueryDto } from '../dto/list-alert-sla-policies.dto';
import { AuditLogsService } from '../../audit/services/audit-logs.service';

@Injectable()
export class AlertSlaPoliciesService {
  constructor(
    private readonly repo: AlertSlaPolicyRepository,
    private readonly audit: AuditLogsService,
  ) {}

  private validateSlaMinutes(
    acknowledgeWithinMinutes: number,
    resolveWithinMinutes: number,
  ) {
    if (acknowledgeWithinMinutes < 1 || !Number.isInteger(acknowledgeWithinMinutes)) {
      throw new BadRequestException(
        'acknowledgeWithinMinutes must be a positive integer',
      );
    }
    if (resolveWithinMinutes < 1 || !Number.isInteger(resolveWithinMinutes)) {
      throw new BadRequestException(
        'resolveWithinMinutes must be a positive integer',
      );
    }
    if (resolveWithinMinutes < acknowledgeWithinMinutes) {
      throw new BadRequestException(
        'resolveWithinMinutes must be >= acknowledgeWithinMinutes',
      );
    }
  }

  private normalizeSeverity(severity: string): string {
    return severity?.trim().toUpperCase() || '';
  }

  async create(
    ctx: { organizationId: string; userId?: string },
    dto: CreateAlertSlaPolicyDto,
  ) {
    const severity = this.normalizeSeverity(dto.severity);
    if (!severity) {
      throw new BadRequestException('severity is required');
    }

    this.validateSlaMinutes(
      dto.acknowledgeWithinMinutes,
      dto.resolveWithinMinutes,
    );

    const brandId = dto.brandId?.trim() || null;
    const locationId = dto.locationId?.trim() || null;
    const zoneId = null; // Not exposed in API yet

    const conflicting = await this.repo.findConflictingActivePolicy(
      ctx.organizationId,
      { severity, brandId, locationId, zoneId },
    );
    if (conflicting && dto.isActive !== false) {
      throw new ConflictException(
        'An active policy already exists for this scope and severity',
      );
    }

    const created = await this.repo.create({
      organizationId: ctx.organizationId,
      severity,
      brandId,
      locationId,
      zoneId,
      acknowledgeWithinMinutes: dto.acknowledgeWithinMinutes,
      resolveWithinMinutes: dto.resolveWithinMinutes,
      isActive: dto.isActive ?? true,
    });

    await this.audit.recordWrite('ALERT_SLA_POLICY_CREATE', ctx, created.id, {
      after: created,
    });
    return created;
  }

  async getById(ctx: { organizationId: string }, id: string) {
    const policy = await this.repo.findById(ctx.organizationId, id);
    if (!policy) throw new NotFoundException('Alert SLA policy not found');
    return policy;
  }

  async list(
    ctx: { organizationId: string },
    query: ListAlertSlaPoliciesQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const pagination = { page, limit };

    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      severity: query.severity,
      isActive: query.isActive,
    };

    const [items, total] = await Promise.all([
      this.repo.findMany(ctx.organizationId, filters, pagination),
      this.repo.count(ctx.organizationId, filters),
    ]);

    return { items, total, page, limit };
  }

  async update(
    ctx: { organizationId: string; userId?: string },
    id: string,
    dto: UpdateAlertSlaPolicyDto,
  ) {
    const existing = await this.getById(ctx, id);

    const severity = dto.severity != null
      ? this.normalizeSeverity(dto.severity)
      : existing.severity;
    const brandId = dto.brandId !== undefined
      ? (dto.brandId?.trim() || null)
      : existing.brandId;
    const locationId = dto.locationId !== undefined
      ? (dto.locationId?.trim() || null)
      : existing.locationId;
    const zoneId = existing.zoneId; // Not exposed in API
    const acknowledgeWithinMinutes =
      dto.acknowledgeWithinMinutes ?? existing.acknowledgeWithinMinutes;
    const resolveWithinMinutes =
      dto.resolveWithinMinutes ?? existing.resolveWithinMinutes;
    const isActive = dto.isActive ?? existing.isActive;

    if (severity !== existing.severity) {
      if (!severity) {
        throw new BadRequestException('severity cannot be empty');
      }
    }

    this.validateSlaMinutes(acknowledgeWithinMinutes, resolveWithinMinutes);

    if (isActive) {
      const conflicting = await this.repo.findConflictingActivePolicy(
        ctx.organizationId,
        { severity, brandId, locationId, zoneId },
        id,
      );
      if (conflicting) {
        throw new ConflictException(
          'An active policy already exists for this scope and severity',
        );
      }
    }

    const updateData: Parameters<typeof this.repo.update>[2] = {};
    if (dto.severity !== undefined) updateData.severity = severity;
    if (dto.brandId !== undefined) updateData.brandId = brandId;
    if (dto.locationId !== undefined) updateData.locationId = locationId;
    if (dto.acknowledgeWithinMinutes !== undefined)
      updateData.acknowledgeWithinMinutes = acknowledgeWithinMinutes;
    if (dto.resolveWithinMinutes !== undefined)
      updateData.resolveWithinMinutes = resolveWithinMinutes;
    if (dto.isActive !== undefined) updateData.isActive = isActive;

    const updated = await this.repo.update(ctx.organizationId, id, updateData);

    await this.audit.recordWrite('ALERT_SLA_POLICY_UPDATE', ctx, id, {
      before: existing,
      after: updated,
    });
    return updated;
  }
}
