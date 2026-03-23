import { Injectable } from '@nestjs/common';
import {
  OrganizationEmailSettingsService,
  OrganizationEmailSettingsDto,
  UpdateOrganizationEmailSettingsDto,
} from '../../organization-settings/services/organization-email-settings.service';

@Injectable()
export class SettingsService {
  constructor(private readonly emailSettings: OrganizationEmailSettingsService) {}

  async getEmailSettings(ctx: { organizationId: string }): Promise<OrganizationEmailSettingsDto | null> {
    return this.emailSettings.get(ctx);
  }

  async updateEmailSettings(
    ctx: { organizationId: string; userId?: string },
    dto: UpdateOrganizationEmailSettingsDto,
  ): Promise<OrganizationEmailSettingsDto> {
    return this.emailSettings.upsert(ctx, dto);
  }
}
