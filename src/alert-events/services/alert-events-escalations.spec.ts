import { Test, TestingModule } from '@nestjs/testing';
import { AlertEventsService } from './alert-events.service';
import { AlertEventsRepository } from '../repositories/alert-events.repository';
import { AlertSlaResolverService } from './alert-sla-resolver.service';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import { DOMAIN_EVENT_PUBLISHER } from '../../common/domain-events/contracts/domain-event-publisher.interface';

describe('AlertEventsService (escalations)', () => {
  let service: AlertEventsService;
  let repo: jest.Mocked<AlertEventsRepository>;

  const mockOrgId = 'org-123';

  const mockRepoItem = {
    alertEventId: 'alert-1',
    severity: 'CRITICAL',
    status: 'OPEN',
    createdAt: new Date('2025-03-17T10:00:00Z'),
    acknowledgedAt: null as Date | null,
    resolvedAt: null as Date | null,
    sourceType: 'CHECKLIST_RUN_ITEM',
    sourceId: 'item-1',
    scope: {
      brandId: 'brand-1',
      locationId: 'loc-1',
      zoneId: 'zone-1',
    },
    sla: {
      acknowledgeWithinMinutes: 15,
      resolveWithinMinutes: 60,
      acknowledgeBy: new Date('2025-03-17T10:15:00Z'),
      resolveBy: new Date('2025-03-17T11:00:00Z'),
      acknowledgeBreached: true,
      resolveBreached: true,
    },
  };

  const mockSummary = {
    totalActiveAlerts: 5,
    acknowledgeBreached: 2,
    resolveBreached: 1,
    bySeverity: {
      critical: { total: 1, acknowledgeBreached: 1, resolveBreached: 1 },
      high: { total: 2, acknowledgeBreached: 1, resolveBreached: 0 },
      medium: { total: 2, acknowledgeBreached: 0, resolveBreached: 0 },
      low: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
      unknown: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
    },
  };

  const mockSummaryByLocation = {
    items: [
      {
        locationId: 'loc-1',
        totalActiveAlerts: 3,
        acknowledgeBreached: 1,
        resolveBreached: 2,
        bySeverity: {
          critical: { total: 1, acknowledgeBreached: 1, resolveBreached: 1 },
          high: { total: 2, acknowledgeBreached: 0, resolveBreached: 1 },
          medium: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
          low: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
          unknown: { total: 0, acknowledgeBreached: 0, resolveBreached: 0 },
        },
      },
    ],
  };

  const mockEscalationsTrends = [
    {
      date: '2025-03-01',
      totalActiveAlerts: 3,
      acknowledgeBreached: 1,
      resolveBreached: 0,
    },
    {
      date: '2025-03-02',
      totalActiveAlerts: 2,
      acknowledgeBreached: 2,
      resolveBreached: 1,
    },
  ];

  beforeEach(async () => {
    const mockRepo = {
      listEscalations: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getEscalationsSummary: jest.fn().mockResolvedValue(mockSummary),
      getEscalationsSummaryByLocation: jest.fn().mockResolvedValue(mockSummaryByLocation),
      getEscalationsTrends: jest.fn().mockResolvedValue(mockEscalationsTrends),
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

  describe('getEscalationsSummary', () => {
    it('returns summary from repository', async () => {
      const result = await service.getEscalationsSummary(
        { organizationId: mockOrgId },
        {},
      );

      expect(result).toEqual(mockSummary);
      expect(repo.getEscalationsSummary).toHaveBeenCalledWith(
        mockOrgId,
        {
          brandId: undefined,
          locationId: undefined,
          zoneId: undefined,
          severity: undefined,
          status: undefined,
        },
        expect.any(Date),
      );
    });

    it('passes filters to repository', async () => {
      await service.getEscalationsSummary(
        { organizationId: mockOrgId },
        {
          brandId: 'b1',
          locationId: 'l1',
          zoneId: 'z1',
          severity: 'HIGH',
          status: 'OPEN',
        },
      );

      expect(repo.getEscalationsSummary).toHaveBeenCalledWith(
        mockOrgId,
        {
          brandId: 'b1',
          locationId: 'l1',
          zoneId: 'z1',
          severity: 'HIGH',
          status: 'OPEN',
        },
        expect.any(Date),
      );
    });

    it('scopes by organizationId for tenant isolation', async () => {
      await service.getEscalationsSummary(
        { organizationId: 'org-tenant-xyz' },
        {},
      );

      expect(repo.getEscalationsSummary).toHaveBeenCalledWith(
        'org-tenant-xyz',
        expect.any(Object),
        expect.any(Date),
      );
    });
  });

  describe('getEscalationsSummaryByLocation', () => {
    it('returns summary by location from repository', async () => {
      const result = await service.getEscalationsSummaryByLocation(
        { organizationId: mockOrgId },
        {},
      );

      expect(result).toEqual(mockSummaryByLocation);
      expect(repo.getEscalationsSummaryByLocation).toHaveBeenCalledWith(
        mockOrgId,
        {
          brandId: undefined,
          locationId: undefined,
          zoneId: undefined,
          severity: undefined,
          status: undefined,
        },
        expect.any(Date),
      );
    });

    it('passes filters to repository', async () => {
      await service.getEscalationsSummaryByLocation(
        { organizationId: mockOrgId },
        { brandId: 'b1', locationId: 'l1', severity: 'HIGH' },
      );

      expect(repo.getEscalationsSummaryByLocation).toHaveBeenCalledWith(
        mockOrgId,
        {
          brandId: 'b1',
          locationId: 'l1',
          zoneId: undefined,
          severity: 'HIGH',
          status: undefined,
        },
        expect.any(Date),
      );
    });

    it('scopes by organizationId for tenant isolation', async () => {
      await service.getEscalationsSummaryByLocation(
        { organizationId: 'org-tenant-xyz' },
        {},
      );

      expect(repo.getEscalationsSummaryByLocation).toHaveBeenCalledWith(
        'org-tenant-xyz',
        expect.any(Object),
        expect.any(Date),
      );
    });
  });

  describe('getEscalations', () => {
    it('returns empty items when no data', async () => {
      repo.listEscalations.mockResolvedValue({ items: [], total: 0 });

      const result = await service.getEscalations(
        { organizationId: mockOrgId },
        {},
      );

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 25,
      });
      expect(repo.listEscalations).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({
          brandId: undefined,
          locationId: undefined,
          zoneId: undefined,
          severity: undefined,
          status: undefined,
          onlyBreached: false,
        }),
        { page: 1, limit: 25 },
        expect.any(Date),
      );
    });

    it('maps repository rows to response shape with ISO dates', async () => {
      repo.listEscalations.mockResolvedValue({
        items: [mockRepoItem],
        total: 1,
      });

      const result = await service.getEscalations(
        { organizationId: mockOrgId },
        {},
      );

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(25);
      expect(result.items[0]).toEqual({
        alertEventId: 'alert-1',
        severity: 'CRITICAL',
        status: 'OPEN',
        createdAt: '2025-03-17T10:00:00.000Z',
        acknowledgedAt: null,
        resolvedAt: null,
        sourceType: 'CHECKLIST_RUN_ITEM',
        sourceId: 'item-1',
        scope: {
          brandId: 'brand-1',
          locationId: 'loc-1',
          zoneId: 'zone-1',
        },
        sla: {
          acknowledgeWithinMinutes: 15,
          resolveWithinMinutes: 60,
          acknowledgeBy: '2025-03-17T10:15:00.000Z',
          resolveBy: '2025-03-17T11:00:00.000Z',
          acknowledgeBreached: true,
          resolveBreached: true,
        },
      });
    });

    it('passes onlyBreached filter when true', async () => {
      repo.listEscalations.mockResolvedValue({ items: [], total: 0 });

      await service.getEscalations(
        { organizationId: mockOrgId },
        { onlyBreached: true },
      );

      expect(repo.listEscalations).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({ onlyBreached: true }),
        { page: 1, limit: 25 },
        expect.any(Date),
      );
    });

    it('passes pagination and filters to repository', async () => {
      repo.listEscalations.mockResolvedValue({ items: [], total: 0 });

      await service.getEscalations(
        { organizationId: mockOrgId },
        {
          brandId: 'b1',
          locationId: 'l1',
          zoneId: 'z1',
          severity: 'HIGH',
          status: 'OPEN',
          onlyBreached: true,
          page: 2,
          limit: 50,
        },
      );

      expect(repo.listEscalations).toHaveBeenCalledWith(
        mockOrgId,
        {
          brandId: 'b1',
          locationId: 'l1',
          zoneId: 'z1',
          severity: 'HIGH',
          status: 'OPEN',
          onlyBreached: true,
        },
        { page: 2, limit: 50 },
        expect.any(Date),
      );
    });

    it('caps limit at 100', async () => {
      repo.listEscalations.mockResolvedValue({ items: [], total: 0 });

      await service.getEscalations(
        { organizationId: mockOrgId },
        { limit: 200 },
      );

      expect(repo.listEscalations).toHaveBeenCalledWith(
        mockOrgId,
        expect.any(Object),
        { page: 1, limit: 100 },
        expect.any(Date),
      );
    });

    it('converts acknowledgedAt and resolvedAt to ISO strings when present', async () => {
      const itemWithDates = {
        ...mockRepoItem,
        acknowledgedAt: new Date('2025-03-17T10:10:00Z'),
        resolvedAt: new Date('2025-03-17T11:30:00Z'),
        sla: {
          ...mockRepoItem.sla,
          acknowledgeBreached: false,
          resolveBreached: false,
        },
      };
      repo.listEscalations.mockResolvedValue({
        items: [itemWithDates],
        total: 1,
      });

      const result = await service.getEscalations(
        { organizationId: mockOrgId },
        {},
      );

      expect(result.items[0].acknowledgedAt).toBe('2025-03-17T10:10:00.000Z');
      expect(result.items[0].resolvedAt).toBe('2025-03-17T11:30:00.000Z');
      expect(result.items[0].sla.acknowledgeBreached).toBe(false);
      expect(result.items[0].sla.resolveBreached).toBe(false);
    });
  });

  describe('getEscalationsTrends', () => {
    it('returns trends from repository with correct response shape', async () => {
      const result = await service.getEscalationsTrends(
        { organizationId: mockOrgId },
        {},
      );

      expect(result).toEqual({
        interval: 'day',
        points: [
          {
            date: '2025-03-01',
            alerts: {
              totalActiveAlerts: 3,
              acknowledgeBreached: 1,
              resolveBreached: 0,
            },
          },
          {
            date: '2025-03-02',
            alerts: {
              totalActiveAlerts: 2,
              acknowledgeBreached: 2,
              resolveBreached: 1,
            },
          },
        ],
      });
      expect(repo.getEscalationsTrends).toHaveBeenCalledWith(
        mockOrgId,
        {
          brandId: undefined,
          locationId: undefined,
          zoneId: undefined,
          severity: undefined,
          status: undefined,
          from: undefined,
          to: undefined,
        },
        'day',
        expect.any(Date),
      );
    });

    it('returns empty points when no data', async () => {
      repo.getEscalationsTrends.mockResolvedValue([]);

      const result = await service.getEscalationsTrends(
        { organizationId: mockOrgId },
        {},
      );

      expect(result).toEqual({
        interval: 'day',
        points: [],
      });
    });

    it('passes filters to repository', async () => {
      await service.getEscalationsTrends(
        { organizationId: mockOrgId },
        {
          brandId: 'b1',
          locationId: 'l1',
          zoneId: 'z1',
          severity: 'HIGH',
          status: 'OPEN',
          from: '2025-03-01',
          to: '2025-03-15',
          interval: 'week',
        },
      );

      expect(repo.getEscalationsTrends).toHaveBeenCalledWith(
        mockOrgId,
        {
          brandId: 'b1',
          locationId: 'l1',
          zoneId: 'z1',
          severity: 'HIGH',
          status: 'OPEN',
          from: '2025-03-01',
          to: '2025-03-15',
        },
        'week',
        expect.any(Date),
      );
    });

    it('scopes by organizationId for tenant isolation', async () => {
      await service.getEscalationsTrends(
        { organizationId: 'org-tenant-xyz' },
        {},
      );

      expect(repo.getEscalationsTrends).toHaveBeenCalledWith(
        'org-tenant-xyz',
        expect.any(Object),
        'day',
        expect.any(Date),
      );
    });

    it('defaults to day interval when invalid', async () => {
      repo.getEscalationsTrends.mockResolvedValue([]);

      await service.getEscalationsTrends(
        { organizationId: mockOrgId },
        { interval: 'invalid' as 'day' },
      );

      expect(repo.getEscalationsTrends).toHaveBeenCalledWith(
        mockOrgId,
        expect.any(Object),
        'day',
        expect.any(Date),
      );
    });
  });
});
