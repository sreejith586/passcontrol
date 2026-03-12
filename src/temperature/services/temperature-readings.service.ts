import { Injectable, NotFoundException } from '@nestjs/common';
import { TemperatureReadingsRepository } from '../repositories/temperature-readings.repository';
import { TemperaturePoliciesRepository } from '../repositories/temperature-policies.repository';
import { PolicyScopeService } from './policy-scope.service';
import { PolicyResolverService } from './policy-resolver.service';
import { BreachDetectionService } from './breach-detection.service';
import { CreateTemperatureReadingDto } from '../dto/create-temperature-reading.dto';
import { ListTemperatureReadingsQueryDto } from '../dto/list-temperature-readings.dto';
import { TemperatureSourceType } from '../enums/source-type.enum';
import { BreachType } from '../enums/breach-type.enum';
import { AuditLogsService } from '../../audit/services/audit-logs.service';

@Injectable()
export class TemperatureReadingsService {
  constructor(
    private readonly repo: TemperatureReadingsRepository,
    private readonly policiesRepo: TemperaturePoliciesRepository,
    private readonly scopeService: PolicyScopeService,
    private readonly policyResolver: PolicyResolverService,
    private readonly breachDetection: BreachDetectionService,
    private readonly audit: AuditLogsService,
  ) {}

  async create(
    ctx: { organizationId: string; userId?: string },
    dto: CreateTemperatureReadingDto,
    createAlertFn?: (payload: {
      organizationId: string;
      sourceType: string;
      sourceId: string;
      type: string;
      scope: { brandId?: string; locationId: string; zoneId?: string; assetId?: string };
      payload: Record<string, unknown>;
    }) => Promise<unknown>,
  ) {
    await this.scopeService.validateReadingScope(ctx.organizationId, {
      organizationId: dto.organizationId,
      locationId: dto.locationId,
      brandId: dto.brandId,
      zoneId: dto.zoneId,
      assetId: dto.assetId,
      checklistRunId: dto.checklistRunId,
      checklistRunResponseId: dto.checklistRunResponseId,
    });

    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();

    let policyId: string | null = null;
    let minTemp: number | null = null;
    let maxTemp: number | null = null;
    let policyUnit: string | null = null;

    if (dto.policyId) {
      const policy = await this.policiesRepo.findById(ctx.organizationId, dto.policyId);
      if (policy) {
        policyId = policy.id;
        minTemp = policy.minTemp;
        maxTemp = policy.maxTemp;
        policyUnit = policy.unit;
      }
    }

    if (policyId == null) {
      const resolved = await this.policyResolver.resolvePolicy(ctx.organizationId, {
        assetId: dto.assetId ?? null,
        zoneId: dto.zoneId ?? null,
        locationId: dto.locationId,
        brandId: dto.brandId ?? null,
      });
      if (resolved) {
        policyId = resolved.id;
        minTemp = resolved.minTemp;
        maxTemp = resolved.maxTemp;
        policyUnit = resolved.unit;
      }
    }

    let isBreach = false;
    let breachType = BreachType.NONE;

    if (minTemp != null && maxTemp != null && policyUnit != null) {
      const result = this.breachDetection.evaluate(
        dto.readingValue,
        dto.unit,
        minTemp,
        maxTemp,
        policyUnit,
      );
      isBreach = result.isBreach;
      breachType = result.breachType;
    }

    const created = await this.repo.create({
      organizationId: ctx.organizationId,
      brandId: dto.brandId ?? null,
      locationId: dto.locationId,
      zoneId: dto.zoneId ?? null,
      assetId: dto.assetId ?? null,
      policyId: policyId ?? null,
      checklistRunId: dto.checklistRunId ?? null,
      checklistRunResponseId: dto.checklistRunResponseId ?? null,
      sourceType: dto.sourceType,
      readingValue: dto.readingValue,
      unit: dto.unit,
      recordedAt,
      recordedByUserId: ctx.userId ?? null,
      isBreach,
      breachType,
      rawPayloadJson: dto.rawPayloadJson ?? null,
    });

    await this.audit.recordWrite('TEMPERATURE_READING_CREATE', ctx, created.id, { after: created });

    if (isBreach && createAlertFn) {
      await createAlertFn({
        organizationId: ctx.organizationId,
        sourceType: 'TEMPERATURE_READING',
        sourceId: created.id,
        type: 'TEMPERATURE_OUT_OF_RANGE',
        scope: {
          brandId: dto.brandId,
          locationId: dto.locationId,
          zoneId: dto.zoneId,
          assetId: dto.assetId,
        },
        payload: {
          readingId: created.id,
          readingValue: dto.readingValue,
          unit: dto.unit,
          breachType,
          policyId,
          assetId: dto.assetId,
          checklistRunId: dto.checklistRunId,
          checklistRunResponseId: dto.checklistRunResponseId,
        },
      });
    }

    return created;
  }

  async getById(ctx: { organizationId: string }, id: string) {
    const reading = await this.repo.findById(ctx.organizationId, id);
    if (!reading) throw new NotFoundException('Temperature reading not found');
    return reading;
  }

  async list(ctx: { organizationId: string }, query: ListTemperatureReadingsQueryDto) {
    const pagination = { page: query.page ?? 1, limit: query.limit ?? 25 };
    const sort =
      query.sort === 'recorded_at_asc'
        ? { recordedAt: 'asc' as const }
        : query.sort === 'recorded_at_desc'
        ? { recordedAt: 'desc' as const }
        : { createdAt: 'desc' as const };

    return this.repo.list(
      ctx.organizationId,
      {
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
        assetId: query.assetId,
        policyId: query.policyId,
        checklistRunId: query.checklistRunId,
        checklistRunResponseId: query.checklistRunResponseId,
        sourceType: query.sourceType,
        isBreach: query.isBreach,
        breachType: query.breachType,
        from: query.from,
        to: query.to,
      },
      pagination,
      sort,
    );
  }
}
