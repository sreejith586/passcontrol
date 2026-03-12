import { Injectable } from '@nestjs/common';

/**
 * Stub: Entitlement/subscription checks. Extension point for full schema-backed entitlements.
 */
@Injectable()
export class EntitlementService {
  async isModuleEnabled(_organizationId: string, _moduleKey: string): Promise<boolean> {
    return true;
  }

  async isFeatureEnabled(
    _organizationId: string,
    _featureKey: string,
  ): Promise<boolean> {
    return true;
  }

  async checkUsageLimit(
    _organizationId: string,
    _metric: string,
    _current: number,
    _limit: number,
  ): Promise<boolean> {
    return true;
  }
}
