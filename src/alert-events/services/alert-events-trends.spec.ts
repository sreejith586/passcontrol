import { Test, TestingModule } from '@nestjs/testing';
import { AlertEventsService } from './alert-events.service';
import { AlertEventsRepository } from '../repositories/alert-events.repository';
import { AlertSlaResolverService } from './alert-sla-resolver.service';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import { DOMAIN_EVENT_PUBLISHER } from '../../common/domain-events/contracts/domain-event-publisher.interface';

describe('AlertEventsService (trends)', () => {
  let service: AlertEventsService;
  let repo: jest.Mocked<AlertEventsRepository>;

  const mockOrgId = 'org-123';

  beforeEach(async () => {
    const mockRepo = {
      getTrends: jest.fn().mockResolvedValue([]),
    };
    const mockSlaResolver = {
      resolve: jest.fn().mockResolvedValue({
        acknowledgeWithinMinutes: 60,
        resolveWithinMinutes: 240,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEventsService,
        { provide: AlertEventsRepository, useValue: mockRepo },
        { provide: AlertSlaResolverService, useValue: mockSlaResolver },
        { provide: AuditLogsService, useValue: { recordWrite: jest.fn() } },
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get(AlertEventsService);
    repo = module.get(AlertEventsRepository);
  });

  describe('getTrends', () => {
    it('returns empty points when no data', async () => {
      repo.getTrends.mockResolvedValue([]);

      const result = await service.getTrends(
        { organizationId: mockOrgId },
        {},
      );

      expect(result).toEqual({
        interval: 'day',
        points: [],
      });
      expect(repo.getTrends).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({
          brandId: undefined,
          locationId: undefined,
          zoneId: undefined,
          severity: undefined,
          from: undefined,
          to: undefined,
        }),
        'day',
      );
    });

    it('maps repository rows to response shape', async () => {
      repo.getTrends.mockResolvedValue([
        {
          date: '2025-03-01',
          created: 5,
          acknowledged: 2,
          resolved: 1,
        },
        {
          date: '2025-03-02',
          created: 3,
          acknowledged: 1,
          resolved: 2,
        },
      ]);

      const result = await service.getTrends(
        { organizationId: mockOrgId },
        { interval: 'week', from: '2025-03-01' },
      );

      expect(result.interval).toBe('week');
      expect(result.points).toHaveLength(2);
      expect(result.points[0]).toEqual({
        date: '2025-03-01',
        alerts: {
          created: 5,
          acknowledged: 2,
          resolved: 1,
        },
      });
      expect(result.points[1].alerts.resolved).toBe(2);
      expect(repo.getTrends).toHaveBeenCalledWith(
        mockOrgId,
        {
          brandId: undefined,
          locationId: undefined,
          zoneId: undefined,
          severity: undefined,
          from: '2025-03-01',
          to: undefined,
        },
        'week',
      );
    });

    it('defaults to day when interval not provided', async () => {
      repo.getTrends.mockResolvedValue([]);

      await service.getTrends({ organizationId: mockOrgId }, {});

      expect(repo.getTrends).toHaveBeenCalledWith(
        mockOrgId,
        expect.any(Object),
        'day',
      );
    });

    it('passes all filters to repository', async () => {
      repo.getTrends.mockResolvedValue([]);

      await service.getTrends(
        { organizationId: mockOrgId },
        {
          brandId: 'b1',
          locationId: 'l1',
          zoneId: 'z1',
          severity: 'HIGH',
          from: '2025-03-01',
          to: '2025-03-15',
          interval: 'month',
        },
      );

      expect(repo.getTrends).toHaveBeenCalledWith(
        mockOrgId,
        {
          brandId: 'b1',
          locationId: 'l1',
          zoneId: 'z1',
          severity: 'HIGH',
          from: '2025-03-01',
          to: '2025-03-15',
        },
        'month',
      );
    });
  });
});
