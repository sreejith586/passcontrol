import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  OrganizationEmailSettingsService,
  OrganizationEmailSettingsDto,
  UpdateOrganizationEmailSettingsDto,
} from '../../organization-settings/services/organization-email-settings.service';
import { MailService } from '../../notifications/mail/mail.service';

@Injectable()
export class SettingsService {
  constructor(
    private readonly emailSettings: OrganizationEmailSettingsService,
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
  ) {}

  async getEmailSettings(ctx: { organizationId: string }): Promise<OrganizationEmailSettingsDto | null> {
    return this.emailSettings.get(ctx);
  }

  async updateEmailSettings(
    ctx: { organizationId: string; userId?: string },
    dto: UpdateOrganizationEmailSettingsDto,
  ): Promise<OrganizationEmailSettingsDto> {
    return this.emailSettings.upsert(ctx, dto);
  }

  async sendTestEmail(ctx: { organizationId: string; userId?: string }): Promise<{ success: boolean; message: string }> {
    if (!ctx.userId) {
      throw new BadRequestException('User context is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { email: true },
    });
    if (!user?.email?.trim()) {
      throw new BadRequestException('Your account has no email address. Add an email to your profile to receive test emails.');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { name: true },
    });
    const orgName = org?.name ?? 'your organization';

    const subject = '[PassControl] Test email from your organization settings';
    const body = [
      'This is a test email from PassControl.',
      '',
      'Your organization email settings are working correctly.',
      orgName ? `Organization: ${orgName}` : '',
      '',
      '— PassControl',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await this.mail.send(user.email, subject, body, undefined, {
        organizationId: ctx.organizationId,
      });
      return { success: true, message: `Test email sent to ${user.email}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Failed to send: ${msg}` };
    }
  }
}
