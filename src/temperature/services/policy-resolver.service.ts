import { Injectable } from '@nestjs/common';
import { TemperaturePoliciesRepository } from '../repositories/temperature-policies.repository';

/**
 * Resolves the best applicable temperature policy by scope priority (most specific first).
 * Precedence: 1) asset, 2) zone, 3) location, 4) brand/org fallback.
 */
@Injectable()
export class PolicyResolverService {
  constructor(private readonly policiesRepo: TemperaturePoliciesRepository) {}

  /**
   * Returns the single best policy for the given scope, or null if none.
   * Priority: asset-level > zone-level > location-level > brand-level (first match).
   */
  async resolvePolicy(organizationId: string, scope: {
    assetId?: string | null;
    zoneId?: string | null;
    locationId?: string | null;
    brandId?: string | null;
  }): Promise<{
    id: string;
    minTemp: number;
    maxTemp: number;
    unit: string;
  } | null> {
    const candidates = await this.policiesRepo.findApplicablePolicies(organizationId, scope);
    if (candidates.length === 0) return null;

    // Prefer asset-specific, then zone, then location, then brand/org
    const withAsset = candidates.filter((p) => p.assetId != null);
    if (withAsset.length > 0) {
      const match = scope.assetId
        ? withAsset.find((p) => p.assetId === scope.assetId)
        : withAsset[0];
      if (match) return { id: match.id, minTemp: match.minTemp, maxTemp: match.maxTemp, unit: match.unit };
    }

    const withZone = candidates.filter((p) => p.zoneId != null);
    if (withZone.length > 0 && scope.zoneId) {
      const match = withZone.find((p) => p.zoneId === scope.zoneId);
      if (match) return { id: match.id, minTemp: match.minTemp, maxTemp: match.maxTemp, unit: match.unit };
    }

    const withLocation = candidates.filter((p) => p.locationId != null);
    if (withLocation.length > 0 && scope.locationId) {
      const match = withLocation.find((p) => p.locationId === scope.locationId);
      if (match) return { id: match.id, minTemp: match.minTemp, maxTemp: match.maxTemp, unit: match.unit };
    }

    const withBrand = candidates.filter((p) => p.brandId != null);
    if (withBrand.length > 0 && scope.brandId) {
      const match = withBrand.find((p) => p.brandId === scope.brandId);
      if (match) return { id: match.id, minTemp: match.minTemp, maxTemp: match.maxTemp, unit: match.unit };
    }

    return null;
  }
}
