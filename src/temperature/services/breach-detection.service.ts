import { Injectable } from '@nestjs/common';
import { BreachType } from '../enums/breach-type.enum';

/**
 * Deterministic breach evaluation: compare reading value to policy min/max.
 * Unit must match; no conversion in MVP.
 */
@Injectable()
export class BreachDetectionService {
  evaluate(
    readingValue: number,
    unit: string,
    policyMin: number,
    policyMax: number,
    policyUnit: string,
  ): { isBreach: boolean; breachType: BreachType } {
    if (unit !== policyUnit) {
      return { isBreach: false, breachType: BreachType.NONE };
    }

    if (readingValue < policyMin) {
      return { isBreach: true, breachType: BreachType.LOW };
    }
    if (readingValue > policyMax) {
      return { isBreach: true, breachType: BreachType.HIGH };
    }

    return { isBreach: false, breachType: BreachType.NONE };
  }
}
