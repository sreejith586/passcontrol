import { Injectable } from '@nestjs/common';
import { AlertSlaPolicyRepository } from '../repositories/alert-sla-policy.repository';

/** Hardcoded fallback defaults when no DB policy matches. */
const FALLBACK_SLA: Record<string, { acknowledge: number; resolve: number }> = {
  CRITICAL: { acknowledge: 15, resolve: 60 },
  HIGH: { acknowledge: 30, resolve: 120 },
  MEDIUM: { acknowledge: 60, resolve: 240 },
  LOW: { acknowledge: 120, resolve: 480 },
};

const DEFAULT_SLA = FALLBACK_SLA.MEDIUM;

/**
 * Resolves applicable SLA for an alert given organization scope and severity.
 * Matching priority: location+severity > brand+severity > org default+severity > hardcoded defaults.
 */
@Injectable()
export class AlertSlaResolverService {
  constructor(private readonly policyRepo: AlertSlaPolicyRepository) {}

  async resolve(params: {
    organizationId: string;
    brandId?: string | null;
    locationId?: string | null;
    zoneId?: string | null;
    severity: string;
  }): Promise<{ acknowledgeWithinMinutes: number; resolveWithinMinutes: number }> {
    const { organizationId, brandId, locationId, severity } = params;
    const normalizedSeverity = severity?.toUpperCase() || 'MEDIUM';

    // 1. locationId + severity
    if (locationId) {
      const policy = await this.policyRepo.findByLocationAndSeverity(
        organizationId,
        locationId,
        normalizedSeverity,
      );
      if (policy) {
        return policy;
      }
    }

    // 2. brandId + severity
    if (brandId) {
      const policy = await this.policyRepo.findByBrandAndSeverity(
        organizationId,
        brandId,
        normalizedSeverity,
      );
      if (policy) {
        return policy;
      }
    }

    // 3. org default (brandId, locationId, zoneId null) + severity
    const orgDefault = await this.policyRepo.findByOrgDefaultAndSeverity(
      organizationId,
      normalizedSeverity,
    );
    if (orgDefault) {
      return orgDefault;
    }

    // 4. hardcoded fallback
    const fallback = FALLBACK_SLA[normalizedSeverity] ?? DEFAULT_SLA;
    return {
      acknowledgeWithinMinutes: fallback.acknowledge,
      resolveWithinMinutes: fallback.resolve,
    };
  }
}
