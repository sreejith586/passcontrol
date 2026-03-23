import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { OrganizationEmailSettingsService } from '../../organization-settings/services/organization-email-settings.service';

export interface SendOptions {
  organizationId?: string;
}

/**
 * MailService abstraction for sending emails.
 * - If organizationId is provided and org has email settings → use org SMTP
 * - Else if global config (MAIL_SMTP_HOST or MAIL_FROM) is set → use global SMTP or log
 * - Else → log only (no send)
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly globalFrom = process.env.MAIL_FROM?.trim();
  private readonly globalConfigured: boolean;

  constructor(private readonly orgEmailSettings: OrganizationEmailSettingsService) {
    this.globalConfigured = !!(
      process.env.MAIL_SMTP_HOST?.trim() ||
      this.globalFrom
    );
    if (!this.globalConfigured) {
      this.logger.debug('MailService: no global MAIL_SMTP_HOST or MAIL_FROM, will use org settings or log only');
    }
  }

  async send(
    to: string,
    subject: string,
    text: string,
    html?: string,
    options?: SendOptions,
  ): Promise<{ messageId?: string }> {
    const orgId = options?.organizationId;

    if (orgId) {
      const orgConfig = await this.orgEmailSettings.getSmtpConfigForSend(orgId);
      if (orgConfig) {
        return this.sendViaTransport(to, subject, text, html, orgConfig);
      }
    }

    if (this.globalConfigured) {
      const globalConfig = this.getGlobalConfig();
      if (globalConfig) {
        return this.sendViaTransport(to, subject, text, html, globalConfig);
      }
    }

    this.logger.log(`[MAIL] To: ${to}\nSubject: ${subject}\n\n${text}`);
    if (html) this.logger.debug(`[MAIL] HTML body (${html.length} chars)`);
    return {};
  }

  private getGlobalConfig(): { host: string; port: number; user?: string; password?: string; fromEmail: string; fromName?: string } | null {
    const host = process.env.MAIL_SMTP_HOST?.trim();
    if (!host || !this.globalFrom) return null;
    const port = parseInt(process.env.MAIL_SMTP_PORT ?? '587', 10);
    return {
      host,
      port: Number.isFinite(port) ? port : 587,
      user: process.env.MAIL_SMTP_USER?.trim() || undefined,
      password: process.env.MAIL_SMTP_PASSWORD?.trim() || undefined,
      fromEmail: this.globalFrom,
      fromName: process.env.MAIL_FROM_NAME?.trim() || undefined,
    };
  }

  private async sendViaTransport(
    to: string,
    subject: string,
    text: string,
    html: string | undefined,
    config: { host: string; port: number; user?: string; password?: string; fromEmail: string; fromName?: string },
  ): Promise<{ messageId?: string }> {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: config.user && config.password
        ? { user: config.user, pass: config.password }
        : undefined,
    });

    const info = await transporter.sendMail({
      from: config.fromName
        ? `"${config.fromName}" <${config.fromEmail}>`
        : config.fromEmail,
      to,
      subject,
      text,
      html,
    });

    return { messageId: info.messageId };
  }
}
