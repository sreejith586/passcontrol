import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface ResolvedRegionalSettings {
  timezone: string;
  temperatureUnit: string;
}

@Injectable()
export class RegionalSettingsResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveRegionalSettings(
    organizationId: string,
    locationId?: string,
  ): Promise<ResolvedRegionalSettings> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        defaultTimezone: true,
        defaultTemperatureUnit: true,
      },
    });

    let location: { timezone: string; temperatureUnit: string | null } | null = null;
    if (locationId) {
      const loc = await this.prisma.location.findUnique({
        where: { id: locationId, organizationId },
        select: {
          timezone: true,
          temperatureUnit: true,
        },
      });
      location = loc;
    }

    const timezone =
      (location?.timezone ?? null) ??
      (org?.defaultTimezone ?? null) ??
      'UTC';

    const temperatureUnit =
      (location?.temperatureUnit ?? null) ??
      (org?.defaultTemperatureUnit ?? null) ??
      'F';

    return { timezone, temperatureUnit };
  }
}
