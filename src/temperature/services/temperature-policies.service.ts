import { Injectable, NotFoundException } from '@nestjs/common';
import { TemperaturePoliciesRepository } from '../repositories/temperature-policies.repository';
import { PolicyScopeService } from './policy-scope.service';
import { CreateTemperaturePolicyDto } from '../dto/create-temperature-policy.dto';
import { UpdateTemperaturePolicyDto } from '../dto/update-temperature-policy.dto';
import { ListTemperaturePoliciesQueryDto } from '../dto/list-temperature-policies.dto';
import { AuditLogsService } from '../../audit/services/audit-logs.service';

@Injectable()
export class TemperaturePoliciesService {
  constructor(
    private readonly repo: TemperaturePoliciesRepository,
    private readonly scopeService: PolicyScopeService,
    private readonly audit: AuditLogsService,
  ) {}

  async create(ctx: { organizationId: string; userId?: string }, dto: CreateTemperaturePolicyDto) {
    await this.scopeService.validatePolicyScope(ctx.organizationId, dto);

    const created = await this.repo.create({
      organizationId: ctx.organizationId,
      brandId: dto.brandId ?? null,
      locationId: dto.locationId ?? null,
      zoneId: dto.zoneId ?? null,
      assetId: dto.assetId ?? null,
      name: dto.name,
      minTemp: dto.minTemp,
      maxTemp: dto.maxTemp,
      unit: dto.unit,
      breachGraceSeconds: dto.breachGraceSeconds ?? null,
      isActive: dto.isActive,
    });

    await this.audit.recordWrite('TEMPERATURE_POLICY_CREATE', ctx, created.id, { after: created });
    return created;
  }

  async getById(ctx: { organizationId: string }, id: string) {
    const policy = await this.repo.findById(ctx.organizationId, id);
    if (!policy) throw new NotFoundException('Temperature policy not found');
    return policy;
  }

  async list(ctx: { organizationId: string }, query: ListTemperaturePoliciesQueryDto) {
    const pagination = { page: query.page ?? 1, limit: query.limit ?? 25 };
    const sort = { createdAt: 'desc' as const };
    return this.repo.list(ctx.organizationId, {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      assetId: query.assetId,
      isActive: query.isActive,
    }, pagination, sort);
  }

  async update(
    ctx: { organizationId: string; userId?: string },
    id: string,
    dto: UpdateTemperaturePolicyDto,
  ) {
    const existing = await this.getById(ctx, id);
    const updated = await this.repo.update(ctx.organizationId, id, dto);
    await this.audit.recordWrite('TEMPERATURE_POLICY_UPDATE', ctx, id, {
      before: existing,
      after: updated,
    });
    return updated;
  }

  async deactivate(ctx: { organizationId: string; userId?: string }, id: string) {
    const existing = await this.getById(ctx, id);
    const updated = await this.repo.deactivate(ctx.organizationId, id);
    await this.audit.recordWrite('TEMPERATURE_POLICY_DEACTIVATE', ctx, id, {
      before: existing,
      after: updated,
    });
    return updated;
  }
}
