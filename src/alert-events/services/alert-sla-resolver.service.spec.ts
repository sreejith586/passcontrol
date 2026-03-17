import { Test, TestingModule } from '@nestjs/testing';
import { AlertSlaResolverService } from './alert-sla-resolver.service';
import { AlertSlaPolicyRepository } from '../repositories/alert-sla-policy.repository';

describe('AlertSlaResolverService', () => {
  let service: AlertSlaResolverService;
  let policyRepo: jest.Mocked<AlertSlaPolicyRepository>;

  const mockOrgId = 'org-123';

  beforeEach(async () => {
    const mockPolicyRepo = {
      findByLocationAndSeverity: jest.fn().mockResolvedValue(null),
      findByBrandAndSeverity: jest.fn().mockResolvedValue(null),
      findByOrgDefaultAndSeverity: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertSlaResolverService,
        { provide: AlertSlaPolicyRepository, useValue: mockPolicyRepo },
      ],
    }).compile();

    service = module.get(AlertSlaResolverService);
    policyRepo = module.get(AlertSlaPolicyRepository);
  });

  it('returns location-level match when policy exists', async () => {
    policyRepo.findByLocationAndSeverity.mockResolvedValue({
      id: 'policy-loc-1',
      acknowledgeWithinMinutes: 10,
      resolveWithinMinutes: 45,
    });

    const result = await service.resolve({
      organizationId: mockOrgId,
      locationId: 'loc-1',
      brandId: 'brand-1',
      severity: 'CRITICAL',
    });

    expect(result).toEqual({
      acknowledgeWithinMinutes: 10,
      resolveWithinMinutes: 45,
      sourceType: 'LOCATION_POLICY',
      policyId: 'policy-loc-1',
    });
    expect(policyRepo.findByLocationAndSeverity).toHaveBeenCalledWith(
      mockOrgId,
      'loc-1',
      'CRITICAL',
    );
    expect(policyRepo.findByBrandAndSeverity).not.toHaveBeenCalled();
    expect(policyRepo.findByOrgDefaultAndSeverity).not.toHaveBeenCalled();
  });

  it('falls back to brand-level when no location match', async () => {
    policyRepo.findByLocationAndSeverity.mockResolvedValue(null);
    policyRepo.findByBrandAndSeverity.mockResolvedValue({
      id: 'policy-brand-1',
      acknowledgeWithinMinutes: 20,
      resolveWithinMinutes: 90,
    });

    const result = await service.resolve({
      organizationId: mockOrgId,
      locationId: 'loc-1',
      brandId: 'brand-1',
      severity: 'HIGH',
    });

    expect(result).toEqual({
      acknowledgeWithinMinutes: 20,
      resolveWithinMinutes: 90,
      sourceType: 'BRAND_POLICY',
      policyId: 'policy-brand-1',
    });
    expect(policyRepo.findByLocationAndSeverity).toHaveBeenCalled();
    expect(policyRepo.findByBrandAndSeverity).toHaveBeenCalledWith(
      mockOrgId,
      'brand-1',
      'HIGH',
    );
  });

  it('falls back to org default when no location or brand match', async () => {
    policyRepo.findByLocationAndSeverity.mockResolvedValue(null);
    policyRepo.findByBrandAndSeverity.mockResolvedValue(null);
    policyRepo.findByOrgDefaultAndSeverity.mockResolvedValue({
      id: 'policy-org-default',
      acknowledgeWithinMinutes: 30,
      resolveWithinMinutes: 120,
    });

    const result = await service.resolve({
      organizationId: mockOrgId,
      locationId: 'loc-1',
      brandId: 'brand-1',
      severity: 'MEDIUM',
    });

    expect(result).toEqual({
      acknowledgeWithinMinutes: 30,
      resolveWithinMinutes: 120,
      sourceType: 'ORG_DEFAULT_POLICY',
      policyId: 'policy-org-default',
    });
    expect(policyRepo.findByOrgDefaultAndSeverity).toHaveBeenCalledWith(
      mockOrgId,
      'MEDIUM',
    );
  });

  it('falls back to hardcoded defaults when no policy exists', async () => {
    policyRepo.findByLocationAndSeverity.mockResolvedValue(null);
    policyRepo.findByBrandAndSeverity.mockResolvedValue(null);
    policyRepo.findByOrgDefaultAndSeverity.mockResolvedValue(null);

    const result = await service.resolve({
      organizationId: mockOrgId,
      severity: 'CRITICAL',
    });

    expect(result).toEqual({
      acknowledgeWithinMinutes: 15,
      resolveWithinMinutes: 60,
      sourceType: 'FALLBACK_DEFAULT',
      policyId: null,
    });
  });

  it('uses correct hardcoded defaults per severity', async () => {
    policyRepo.findByOrgDefaultAndSeverity.mockResolvedValue(null);

    expect(
      await service.resolve({ organizationId: mockOrgId, severity: 'CRITICAL' }),
    ).toEqual({
      acknowledgeWithinMinutes: 15,
      resolveWithinMinutes: 60,
      sourceType: 'FALLBACK_DEFAULT',
      policyId: null,
    });
    expect(
      await service.resolve({ organizationId: mockOrgId, severity: 'HIGH' }),
    ).toEqual({
      acknowledgeWithinMinutes: 30,
      resolveWithinMinutes: 120,
      sourceType: 'FALLBACK_DEFAULT',
      policyId: null,
    });
    expect(
      await service.resolve({ organizationId: mockOrgId, severity: 'MEDIUM' }),
    ).toEqual({
      acknowledgeWithinMinutes: 60,
      resolveWithinMinutes: 240,
      sourceType: 'FALLBACK_DEFAULT',
      policyId: null,
    });
    expect(
      await service.resolve({ organizationId: mockOrgId, severity: 'LOW' }),
    ).toEqual({
      acknowledgeWithinMinutes: 120,
      resolveWithinMinutes: 480,
      sourceType: 'FALLBACK_DEFAULT',
      policyId: null,
    });
  });

  it('ignores inactive policies (repo only returns active)', async () => {
    policyRepo.findByLocationAndSeverity.mockResolvedValue(null);
    policyRepo.findByOrgDefaultAndSeverity.mockResolvedValue(null);

    const result = await service.resolve({
      organizationId: mockOrgId,
      locationId: 'loc-1',
      severity: 'CRITICAL',
    });

    expect(result).toEqual({
      acknowledgeWithinMinutes: 15,
      resolveWithinMinutes: 60,
      sourceType: 'FALLBACK_DEFAULT',
      policyId: null,
    });
  });

  it('is tenant-scoped (organizationId passed to repo)', async () => {
    policyRepo.findByOrgDefaultAndSeverity.mockResolvedValue({
      id: 'policy-org-xyz',
      acknowledgeWithinMinutes: 25,
      resolveWithinMinutes: 100,
    });

    const result = await service.resolve({
      organizationId: 'org-tenant-xyz',
      severity: 'HIGH',
    });

    expect(policyRepo.findByOrgDefaultAndSeverity).toHaveBeenCalledWith(
      'org-tenant-xyz',
      'HIGH',
    );
    expect(result.sourceType).toBe('ORG_DEFAULT_POLICY');
    expect(result.policyId).toBe('policy-org-xyz');
  });

  it('uses MEDIUM defaults for unknown severity', async () => {
    policyRepo.findByOrgDefaultAndSeverity.mockResolvedValue(null);

    const result = await service.resolve({
      organizationId: mockOrgId,
      severity: 'UNKNOWN',
    });

    expect(result).toEqual({
      acknowledgeWithinMinutes: 60,
      resolveWithinMinutes: 240,
      sourceType: 'FALLBACK_DEFAULT',
      policyId: null,
    });
  });
});
