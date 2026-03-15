import { Test, TestingModule } from '@nestjs/testing';
import { AlertEventsService } from './alert-events.service';
import { AlertEventsRepository } from '../repositories/alert-events.repository';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import { DOMAIN_EVENT_PUBLISHER } from '../../common/domain-events/contracts/domain-event-publisher.interface';
import { ALERT_ACKNOWLEDGED_EVENT } from '../../common/domain-events/events/alert-acknowledged.event';
import { ALERT_RESOLVED_EVENT } from '../../common/domain-events/events/alert-resolved.event';

describe('AlertEventsService (domain events)', () => {
  let service: AlertEventsService;
  let repo: jest.Mocked<AlertEventsRepository>;
  let publisher: { publish: jest.Mock; publishedEvents: unknown[] };

  const mockOrgId = 'org-1';
  const mockAlertId = 'alert-1';

  const createMockAlert = (overrides: Partial<{
    id: string;
    status: string;
    sourceType: string;
    sourceId: string;
    severity: string | null;
    brandId: string | null;
    locationId: string | null;
    zoneId: string | null;
    acknowledgedAt: Date | null;
    acknowledgedByUserId: string | null;
    resolvedAt: Date | null;
    resolvedByUserId: string | null;
    resolutionNote: string | null;
  }> = {}) => ({
    id: mockAlertId,
    organizationId: mockOrgId,
    sourceType: 'CHECKLIST_RUN_ITEM',
    sourceId: 'item-snapshot-1',
    severity: 'HIGH',
    status: 'OPEN',
    brandId: 'brand-1',
    locationId: 'loc-1',
    zoneId: 'zone-1',
    acknowledgedAt: null,
    acknowledgedByUserId: null,
    resolvedAt: null,
    resolvedByUserId: null,
    resolutionNote: null,
    ...overrides,
  });

  beforeEach(async () => {
    publisher = {
      publish: jest.fn().mockImplementation(async (event: unknown) => {
        publisher.publishedEvents.push(event);
      }),
      publishedEvents: [],
    };

    const mockRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEventsService,
        { provide: AlertEventsRepository, useValue: mockRepo },
        { provide: AuditLogsService, useValue: { recordWrite: jest.fn() } },
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: publisher },
      ],
    }).compile();

    service = module.get(AlertEventsService);
    repo = module.get(AlertEventsRepository);
  });

  describe('acknowledge', () => {
    it('publishes alert.acknowledged with correct payload after successful acknowledge', async () => {
      const existing = createMockAlert({ status: 'OPEN' });
      const acknowledgedAt = new Date('2025-03-15T12:00:00Z');
      const updated = createMockAlert({
        status: 'ACKNOWLEDGED',
        acknowledgedAt,
        acknowledgedByUserId: 'user-1',
      });

      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockResolvedValue(updated as never);

      await service.acknowledge(
        { organizationId: mockOrgId, userId: 'user-1' },
        mockAlertId,
      );

      expect(publisher.publish).toHaveBeenCalledTimes(1);
      const event = publisher.publishedEvents[0] as {
        eventName: string;
        organizationId: string;
        payload: Record<string, unknown>;
      };
      expect(event.eventName).toBe(ALERT_ACKNOWLEDGED_EVENT);
      expect(event.organizationId).toBe(mockOrgId);
      expect(event.payload).toMatchObject({
        alertEventId: mockAlertId,
        sourceType: 'CHECKLIST_RUN_ITEM',
        sourceId: 'item-snapshot-1',
        acknowledgedByUserId: 'user-1',
        severity: 'HIGH',
        status: 'ACKNOWLEDGED',
        brandId: 'brand-1',
        locationId: 'loc-1',
        zoneId: 'zone-1',
      });
      expect(event.payload.acknowledgedAt).toEqual(acknowledgedAt);
    });

    it('does NOT publish when acknowledge fails (bad request)', async () => {
      const existing = createMockAlert({ status: 'ACKNOWLEDGED' });
      repo.findById.mockResolvedValue(existing as never);

      await expect(
        service.acknowledge(
          { organizationId: mockOrgId, userId: 'user-1' },
          mockAlertId,
        ),
      ).rejects.toThrow('Only OPEN alerts can be acknowledged');

      expect(publisher.publish).not.toHaveBeenCalled();
    });

    it('does NOT publish when repo.update returns null/undefined', async () => {
      const existing = createMockAlert({ status: 'OPEN' });
      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockResolvedValue(null as never);

      await service.acknowledge(
        { organizationId: mockOrgId, userId: 'user-1' },
        mockAlertId,
      );

      expect(publisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('resolve', () => {
    it('publishes alert.resolved with correct payload after successful resolve', async () => {
      const existing = createMockAlert({ status: 'ACKNOWLEDGED' });
      const resolvedAt = new Date('2025-03-15T14:00:00Z');
      const updated = createMockAlert({
        status: 'RESOLVED',
        resolvedAt,
        resolvedByUserId: 'user-1',
        resolutionNote: 'Fixed the issue',
      });

      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockResolvedValue(updated as never);

      await service.resolve(
        { organizationId: mockOrgId, userId: 'user-1' },
        mockAlertId,
        'Fixed the issue',
      );

      expect(publisher.publish).toHaveBeenCalledTimes(1);
      const event = publisher.publishedEvents[0] as {
        eventName: string;
        organizationId: string;
        payload: Record<string, unknown>;
      };
      expect(event.eventName).toBe(ALERT_RESOLVED_EVENT);
      expect(event.organizationId).toBe(mockOrgId);
      expect(event.payload).toMatchObject({
        alertEventId: mockAlertId,
        sourceType: 'CHECKLIST_RUN_ITEM',
        sourceId: 'item-snapshot-1',
        resolvedByUserId: 'user-1',
        severity: 'HIGH',
        status: 'RESOLVED',
        resolutionNote: 'Fixed the issue',
        brandId: 'brand-1',
        locationId: 'loc-1',
        zoneId: 'zone-1',
      });
      expect(event.payload.resolvedAt).toEqual(resolvedAt);
    });

    it('does NOT publish when resolve fails (already resolved)', async () => {
      const existing = createMockAlert({ status: 'RESOLVED' });
      repo.findById.mockResolvedValue(existing as never);

      await expect(
        service.resolve(
          { organizationId: mockOrgId, userId: 'user-1' },
          mockAlertId,
        ),
      ).rejects.toThrow('Alert is already resolved');

      expect(publisher.publish).not.toHaveBeenCalled();
    });

    it('propagates publisher failure (fail-fast)', async () => {
      const existing = createMockAlert({ status: 'OPEN' });
      const updated = createMockAlert({
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedByUserId: 'user-1',
      });

      repo.findById.mockResolvedValue(existing as never);
      repo.update.mockResolvedValue(updated as never);
      publisher.publish.mockRejectedValueOnce(new Error('Publisher error'));

      await expect(
        service.acknowledge(
          { organizationId: mockOrgId, userId: 'user-1' },
          mockAlertId,
        ),
      ).rejects.toThrow('Publisher error');
    });
  });
});
