import { Injectable } from '@nestjs/common';
import { MailService } from './mail.service';
import { getEmailSubject, getEmailBody } from './email-templates';
import { NotificationType } from '@prisma/client';

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class EmailChannelService {
  constructor(private readonly mail: MailService) {}

  async send(
    to: string,
    notificationType: NotificationType,
    payload: Record<string, unknown>,
    options?: { organizationId?: string },
  ): Promise<{ success: true; messageId?: string } | { success: false; error: string }> {
    try {
      const subject = getEmailSubject(notificationType, payload);
      const body = getEmailBody(notificationType, payload);
      const result = await this.mail.send(to, subject, body, undefined, {
        organizationId: options?.organizationId,
      });
      return { success: true, messageId: result.messageId };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  }
}
