import { Injectable, BadRequestException } from '@nestjs/common';
import { OrganizationEmailSettingsRepository } from '../repositories/organization-email-settings.repository';
import { EncryptionService } from '../../infra/crypto/encryption.service';
import { AuditLogsService } from '../../audit/services/audit-logs.service';

export interface OrganizationEmailSettingsDto {
  smtpHost: string;
  smtpPort: number;
  smtpUser?: string | null;
  fromEmail: string;
  fromName?: string | null;
  hasPassword?: boolean;
}

export interface UpdateOrganizationEmailSettingsDto {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  fromEmail?: string;
  fromName?: string | null;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  password?: string;
  fromEmail: string;
  fromName?: string;
}

@Injectable()
export class OrganizationEmailSettingsService {
  constructor(
    private readonly repo: OrganizationEmailSettingsRepository,
    private readonly encryption: EncryptionService,
    private readonly audit: AuditLogsService,
  ) {}

  async get(ctx: { organizationId: string }): Promise<OrganizationEmailSettingsDto | null> {
    const row = await this.repo.findByOrganizationId(ctx.organizationId);
    if (!row) return null;
    return {
      smtpHost: row.smtpHost,
      smtpPort: row.smtpPort,
      smtpUser: row.smtpUser,
      fromEmail: row.fromEmail,
      fromName: row.fromName,
      hasPassword: !!row.smtpPasswordEncrypted,
    };
  }

  async upsert(
    ctx: { organizationId: string; userId?: string },
    dto: UpdateOrganizationEmailSettingsDto,
  ): Promise<OrganizationEmailSettingsDto> {
    const before = await this.repo.findByOrganizationId(ctx.organizationId);

    const updateData: {
      smtpHost: string;
      smtpPort: number;
      smtpUser?: string | null;
      smtpPasswordEncrypted?: string | null;
      fromEmail: string;
      fromName?: string | null;
    } = {
      smtpHost: dto.smtpHost ?? before?.smtpHost ?? '',
      smtpPort: dto.smtpPort ?? before?.smtpPort ?? 587,
      smtpUser: dto.smtpUser !== undefined ? dto.smtpUser : before?.smtpUser,
      fromEmail: dto.fromEmail ?? before?.fromEmail ?? '',
      fromName: dto.fromName !== undefined ? dto.fromName : before?.fromName,
    };

    if (dto.smtpPassword !== undefined) {
      try {
        updateData.smtpPasswordEncrypted = dto.smtpPassword
          ? this.encryption.encrypt(dto.smtpPassword)
          : null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('ENCRYPTION_KEY')) {
          throw new BadRequestException(
            'Email settings could not be saved. The server is missing or has invalid encryption configuration. Contact your administrator to ensure ENCRYPTION_KEY is set (minimum 32 characters).'
          );
        }
        throw err;
      }
    } else if (before?.smtpPasswordEncrypted) {
      updateData.smtpPasswordEncrypted = before.smtpPasswordEncrypted;
    }

    if (!updateData.smtpHost || !updateData.fromEmail) {
      throw new BadRequestException('smtpHost and fromEmail are required');
    }

    const updated = await this.repo.upsert(ctx.organizationId, updateData);

    const safeBefore = before
      ? { smtpHost: before.smtpHost, smtpPort: before.smtpPort, fromEmail: before.fromEmail }
      : undefined;
    const safeAfter = {
      smtpHost: updated.smtpHost,
      smtpPort: updated.smtpPort,
      fromEmail: updated.fromEmail,
    };
    await this.audit.recordWrite(
      'ORGANIZATION_EMAIL_SETTINGS_UPSERT',
      ctx,
      ctx.organizationId,
      { before: safeBefore, after: safeAfter },
    );

    return {
      smtpHost: updated.smtpHost,
      smtpPort: updated.smtpPort,
      smtpUser: updated.smtpUser,
      fromEmail: updated.fromEmail,
      fromName: updated.fromName,
      hasPassword: !!updated.smtpPasswordEncrypted,
    };
  }

  async getSmtpConfigForSend(organizationId: string): Promise<SmtpConfig | null> {
    const row = await this.repo.findByOrganizationId(organizationId);
    if (!row) return null;

    let password: string | undefined;
    if (row.smtpPasswordEncrypted) {
      try {
        password = this.encryption.decrypt(row.smtpPasswordEncrypted);
      } catch {
        return null;
      }
    }

    return {
      host: row.smtpHost,
      port: row.smtpPort,
      user: row.smtpUser ?? undefined,
      password,
      fromEmail: row.fromEmail,
      fromName: row.fromName ?? undefined,
    };
  }
}
