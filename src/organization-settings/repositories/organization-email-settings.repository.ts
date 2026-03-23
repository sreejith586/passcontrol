import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class OrganizationEmailSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrganizationId(organizationId: string) {
    return this.prisma.organizationEmailSettings.findUnique({
      where: { organizationId },
    });
  }

  async upsert(organizationId: string, data: {
    smtpHost: string;
    smtpPort: number;
    smtpUser?: string | null;
    smtpPasswordEncrypted?: string | null;
    smtpCaCertPem?: string | null;
    fromEmail: string;
    fromName?: string | null;
  }) {
    return this.prisma.organizationEmailSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        ...data,
      },
      update: data,
    });
  }
}
