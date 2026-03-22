import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationSettingsRepository } from '../repositories/organization-settings.repository';
import { UpdateAlertWorkflowDto } from '../dto/update-alert-workflow.dto';
import { UpdateRegionalSettingsDto } from '../dto/update-regional-settings.dto';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import { RegionalSettingsResolverService } from '../../common/services/regional-settings-resolver.service';
import { validateTimezone } from '../../checklists/schedules/validators/schedule-recurrence.validator';

@Injectable()
export class OrganizationSettingsService {
  constructor(
    private readonly repo: OrganizationSettingsRepository,
    private readonly audit: AuditLogsService,
    private readonly regionalResolver: RegionalSettingsResolverService,
  ) {}

  async getAlertWorkflow(ctx: { organizationId: string }) {
    const settings = await this.repo.getAlertWorkflowSettings(ctx.organizationId);
    if (!settings) {
      throw new NotFoundException('Organization not found');
    }
    return {
      requireResolutionNoteOnResolve: settings.requireResolutionNoteOnResolve,
      requireReopenNoteOnReopen: settings.requireReopenNoteOnReopen,
    };
  }

  async updateAlertWorkflow(
    ctx: { organizationId: string; userId?: string },
    dto: UpdateAlertWorkflowDto,
  ) {
    const before = await this.repo.getAlertWorkflowSettings(ctx.organizationId);
    if (!before) {
      throw new NotFoundException('Organization not found');
    }

    const updateData: { requireResolutionNoteOnResolve?: boolean; requireReopenNoteOnReopen?: boolean } = {};
    if (dto.requireResolutionNoteOnResolve !== undefined) {
      updateData.requireResolutionNoteOnResolve = dto.requireResolutionNoteOnResolve;
    }
    if (dto.requireReopenNoteOnReopen !== undefined) {
      updateData.requireReopenNoteOnReopen = dto.requireReopenNoteOnReopen;
    }

    const updated = Object.keys(updateData).length > 0
      ? await this.repo.updateAlertWorkflowSettings(ctx.organizationId, updateData)
      : before;

    if (updated && Object.keys(updateData).length > 0) {
      await this.audit.recordWrite(
        'ORGANIZATION_SETTINGS_ALERT_WORKFLOW_UPDATE',
        ctx,
        ctx.organizationId,
        {
          before: {
            requireResolutionNoteOnResolve: before.requireResolutionNoteOnResolve,
            requireReopenNoteOnReopen: before.requireReopenNoteOnReopen,
          },
          after: {
            requireResolutionNoteOnResolve: updated.requireResolutionNoteOnResolve,
            requireReopenNoteOnReopen: updated.requireReopenNoteOnReopen,
          },
        },
      );
    }

    return {
      requireResolutionNoteOnResolve: updated?.requireResolutionNoteOnResolve ?? before.requireResolutionNoteOnResolve,
      requireReopenNoteOnReopen: updated?.requireReopenNoteOnReopen ?? before.requireReopenNoteOnReopen,
    };
  }

  async getRegional(ctx: { organizationId: string }) {
    const settings = await this.repo.getRegionalSettings(ctx.organizationId);
    if (!settings) {
      throw new NotFoundException('Organization not found');
    }
    return {
      defaultTimezone: settings.defaultTimezone,
      defaultTemperatureUnit: settings.defaultTemperatureUnit as 'F' | 'C' | null,
    };
  }

  async updateRegional(
    ctx: { organizationId: string; userId?: string },
    dto: UpdateRegionalSettingsDto,
  ) {
    const before = await this.repo.getRegionalSettings(ctx.organizationId);
    if (!before) {
      throw new NotFoundException('Organization not found');
    }

    if (dto.defaultTimezone !== undefined && dto.defaultTimezone !== null) {
      validateTimezone(dto.defaultTimezone);
    }

    const updateData: {
      defaultTimezone?: string | null;
      defaultTemperatureUnit?: string | null;
    } = {};
    if (dto.defaultTimezone !== undefined) {
      updateData.defaultTimezone = dto.defaultTimezone ?? null;
    }
    if (dto.defaultTemperatureUnit !== undefined) {
      updateData.defaultTemperatureUnit = dto.defaultTemperatureUnit ?? null;
    }

    const updated = Object.keys(updateData).length > 0
      ? await this.repo.updateRegionalSettings(ctx.organizationId, updateData)
      : before;

    if (updated && Object.keys(updateData).length > 0) {
      await this.audit.recordWrite(
        'ORGANIZATION_SETTINGS_REGIONAL_UPDATE',
        ctx,
        ctx.organizationId,
        {
          before: {
            defaultTimezone: before.defaultTimezone,
            defaultTemperatureUnit: before.defaultTemperatureUnit,
          },
          after: {
            defaultTimezone: updated.defaultTimezone,
            defaultTemperatureUnit: updated.defaultTemperatureUnit,
          },
        },
      );
    }

    return {
      defaultTimezone: updated?.defaultTimezone ?? before.defaultTimezone,
      defaultTemperatureUnit: (updated?.defaultTemperatureUnit ?? before.defaultTemperatureUnit) as 'F' | 'C' | null,
    };
  }

  async getRegionalResolved(ctx: { organizationId: string }, locationId?: string) {
    return this.regionalResolver.resolveRegionalSettings(
      ctx.organizationId,
      locationId,
    );
  }
}
