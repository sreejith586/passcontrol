import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationSettingsRepository } from '../repositories/organization-settings.repository';
import { UpdateAlertWorkflowDto } from '../dto/update-alert-workflow.dto';
import { AuditLogsService } from '../../audit/services/audit-logs.service';

@Injectable()
export class OrganizationSettingsService {
  constructor(
    private readonly repo: OrganizationSettingsRepository,
    private readonly audit: AuditLogsService,
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
}
