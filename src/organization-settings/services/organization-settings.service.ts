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

    const updated = await this.repo.updateAlertWorkflowSettings(
      ctx.organizationId,
      { requireResolutionNoteOnResolve: dto.requireResolutionNoteOnResolve },
    );

    if (updated) {
      await this.audit.recordWrite(
        'ORGANIZATION_SETTINGS_ALERT_WORKFLOW_UPDATE',
        ctx,
        ctx.organizationId,
        {
          before: { requireResolutionNoteOnResolve: before.requireResolutionNoteOnResolve },
          after: { requireResolutionNoteOnResolve: updated.requireResolutionNoteOnResolve },
        },
      );
    }

    return {
      requireResolutionNoteOnResolve: updated?.requireResolutionNoteOnResolve ?? before.requireResolutionNoteOnResolve,
    };
  }
}
