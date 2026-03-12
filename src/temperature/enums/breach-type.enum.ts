/**
 * Type of temperature breach when evaluated against policy.
 */
export enum BreachType {
  NONE = 'NONE',
  LOW = 'LOW',   // below min_temp
  HIGH = 'HIGH', // above max_temp
}
