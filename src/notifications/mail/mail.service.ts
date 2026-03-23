import { Injectable, Logger } from '@nestjs/common';

/**
 * MailService abstraction for sending emails.
 * If no provider is configured (MAIL_FROM env var), logs the email instead of sending.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly isConfigured: boolean;

  constructor() {
    this.isConfigured = !!process.env.MAIL_FROM?.trim();
    if (!this.isConfigured) {
      this.logger.debug('MailService: no MAIL_FROM configured, emails will be logged only');
    }
  }

  async send(to: string, subject: string, text: string, html?: string): Promise<{ messageId?: string }> {
    if (this.isConfigured) {
      // TODO: integrate with SMTP/SendGrid/etc when provider is added
      this.logger.log(`[MAIL] Would send to ${to}: ${subject}`);
      return { messageId: `log-${Date.now()}` };
    }
    this.logger.log(`[MAIL] To: ${to}\nSubject: ${subject}\n\n${text}`);
    if (html) {
      this.logger.debug(`[MAIL] HTML body (${html.length} chars)`);
    }
    return {};
  }
}
