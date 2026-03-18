import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AlertEventActivitiesService } from './alert-event-activities.service';
import { AlertEventActivitiesRepository } from '../repositories/alert-event-activities.repository';
import { AlertEventsRepository } from '../../alert-events/repositories/alert-events.repository';

describe('AlertEventActivitiesService', () => {
  let service: AlertEventActivitiesService;
  let activitiesRepo: jest.Mocked<AlertEventActivitiesRepository>;
  let alertEventsRepo: jest.Mocked<AlertEventsRepository>;

  const mockOrgId = 'org-123';
  const mockAlertId = 'alert-1';

  beforeEach(async () => {
    const mockActivitiesRepo = {
      create: jest.fn().mockResolvedValue({ id: 'act-1' }),
      findByAlertId: jest.fn().mockResolvedValue([]),
    };
    const mockAlertEventsRepo = {
      findById: jest.fn().mockResolvedValue({ id: mockAlertId, organizationId: mockOrgId }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEventActivitiesService,
        { provide: AlertEventActivitiesRepository, useValue: mockActivitiesRepo },
        { provide: AlertEventsRepository, useValue: mockAlertEventsRepo },
      ],
    }).compile();

    service = module.get(AlertEventActivitiesService);
    activitiesRepo = module.get(AlertEventActivitiesRepository);
    alertEventsRepo = module.get(AlertEventsRepository);
  });

  describe('listForAlert', () => {
    it('returns activities for alert', async () => {
      const mockActivities = [
        {
          id: 'act-1',
          type: 'CREATED',
          actorUserId: null,
          fromStatus: null,
          toStatus: 'OPEN',
          fromAssignedToUserId: null,
          toAssignedToUserId: null,
          comment: null,
          metadata: null,
          createdAt: new Date('2025-03-18T10:00:00Z'),
        },
      ];
      activitiesRepo.findByAlertId.mockResolvedValue(mockActivities as never);

      const result = await service.listForAlert(mockOrgId, mockAlertId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'act-1',
        type: 'CREATED',
        toStatus: 'OPEN',
        createdAt: '2025-03-18T10:00:00.000Z',
      });
      expect(alertEventsRepo.findById).toHaveBeenCalledWith(mockOrgId, mockAlertId);
      expect(activitiesRepo.findByAlertId).toHaveBeenCalledWith(mockOrgId, mockAlertId);
    });

    it('throws NotFoundException when alert does not exist', async () => {
      alertEventsRepo.findById.mockResolvedValue(null);

      await expect(service.listForAlert(mockOrgId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );

      expect(activitiesRepo.findByAlertId).not.toHaveBeenCalled();
    });

    it('enforces organization isolation', async () => {
      activitiesRepo.findByAlertId.mockResolvedValue([]);

      await service.listForAlert('org-other', mockAlertId);

      expect(alertEventsRepo.findById).toHaveBeenCalledWith('org-other', mockAlertId);
      expect(activitiesRepo.findByAlertId).toHaveBeenCalledWith('org-other', mockAlertId);
    });
  });

  describe('logAssignmentChanged', () => {
    it('logs ASSIGNED when from null to user', async () => {
      await service.logAssignmentChanged(
        mockOrgId,
        mockAlertId,
        null,
        'user-2',
        'user-1',
      );

      expect(activitiesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: mockOrgId,
          alertEventId: mockAlertId,
          type: 'ASSIGNED',
          fromAssignedToUserId: null,
          toAssignedToUserId: 'user-2',
          actorUserId: 'user-1',
        }),
        undefined,
      );
    });

    it('logs UNASSIGNED when from user to null', async () => {
      await service.logAssignmentChanged(
        mockOrgId,
        mockAlertId,
        'user-2',
        null,
        'user-1',
      );

      expect(activitiesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UNASSIGNED',
          fromAssignedToUserId: 'user-2',
          toAssignedToUserId: null,
        }),
        undefined,
      );
    });

    it('logs REASSIGNED when from user to different user', async () => {
      await service.logAssignmentChanged(
        mockOrgId,
        mockAlertId,
        'user-2',
        'user-3',
        'user-1',
      );

      expect(activitiesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REASSIGNED',
          fromAssignedToUserId: 'user-2',
          toAssignedToUserId: 'user-3',
        }),
        undefined,
      );
    });
  });
});
