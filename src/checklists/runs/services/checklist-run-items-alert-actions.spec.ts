import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ChecklistRunItemsService } from './checklist-run-items.service';
import { ChecklistRunItemsRepository } from '../repositories/checklist-run-items.repository';
import { AlertEventsRepository } from '../../../alert-events/repositories/alert-events.repository';
import { AlertEventsService } from '../../../alert-events/services/alert-events.service';
import { AlertStatus } from '@prisma/client';

describe('ChecklistRunItemsService (alert convenience actions)', () => {
  let service: ChecklistRunItemsService;
  let itemsRepo: jest.Mocked<ChecklistRunItemsRepository>;
  let alertEventsRepo: jest.Mocked<AlertEventsRepository>;
  let alertEventsService: jest.Mocked<AlertEventsService>;

  const mockOrgId = 'org-1';
  const mockItemId = 'item-1';
  const mockAlertId = 'alert-1';

  beforeEach(async () => {
    const mockItemsRepo = {
      findById: jest.fn(),
    };
    const mockAlertEventsRepo = {
      findFirstBySourceAndStatuses: jest.fn(),
    };
    const mockAlertEventsService = {
      acknowledge: jest.fn(),
      resolve: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistRunItemsService,
        { provide: ChecklistRunItemsRepository, useValue: mockItemsRepo },
        { provide: AlertEventsRepository, useValue: mockAlertEventsRepo },
        { provide: AlertEventsService, useValue: mockAlertEventsService },
      ],
    }).compile();

    service = module.get(ChecklistRunItemsService);
    itemsRepo = module.get(ChecklistRunItemsRepository);
    alertEventsRepo = module.get(AlertEventsRepository);
    alertEventsService = module.get(AlertEventsService);
  });

  describe('acknowledgeAlert', () => {
    it('delegates to AlertEventsService.acknowledge for latest OPEN alert', async () => {
      const mockAlert = { id: mockAlertId, status: AlertStatus.OPEN };
      const updatedAlert = { id: mockAlertId, status: AlertStatus.ACKNOWLEDGED };

      itemsRepo.findById.mockResolvedValue({ id: mockItemId } as never);
      alertEventsRepo.findFirstBySourceAndStatuses.mockResolvedValue(
        mockAlert as never,
      );
      alertEventsService.acknowledge.mockResolvedValue(updatedAlert as never);

      const result = await service.acknowledgeAlert(
        { organizationId: mockOrgId, userId: 'user-1' },
        mockItemId,
      );

      expect(itemsRepo.findById).toHaveBeenCalledWith(mockOrgId, mockItemId);
      expect(alertEventsRepo.findFirstBySourceAndStatuses).toHaveBeenCalledWith(
        mockOrgId,
        'CHECKLIST_RUN_ITEM',
        mockItemId,
        [AlertStatus.OPEN],
      );
      expect(alertEventsService.acknowledge).toHaveBeenCalledWith(
        { organizationId: mockOrgId, userId: 'user-1' },
        mockAlertId,
      );
      expect(result).toEqual(updatedAlert);
    });

    it('throws NotFoundException when item not found', async () => {
      itemsRepo.findById.mockResolvedValue(null);

      await expect(
        service.acknowledgeAlert(
          { organizationId: mockOrgId, userId: 'user-1' },
          mockItemId,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(alertEventsRepo.findFirstBySourceAndStatuses).not.toHaveBeenCalled();
      expect(alertEventsService.acknowledge).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when no OPEN alert exists', async () => {
      itemsRepo.findById.mockResolvedValue({ id: mockItemId } as never);
      alertEventsRepo.findFirstBySourceAndStatuses.mockResolvedValue(null);

      await expect(
        service.acknowledgeAlert(
          { organizationId: mockOrgId, userId: 'user-1' },
          mockItemId,
        ),
      ).rejects.toThrow('No OPEN alert found for this checklist run item');

      expect(alertEventsService.acknowledge).not.toHaveBeenCalled();
    });
  });

  describe('resolveAlert', () => {
    it('delegates to AlertEventsService.resolve for latest OPEN/ACKNOWLEDGED alert', async () => {
      const mockAlert = { id: mockAlertId, status: AlertStatus.ACKNOWLEDGED };
      const updatedAlert = { id: mockAlertId, status: AlertStatus.RESOLVED };

      itemsRepo.findById.mockResolvedValue({ id: mockItemId } as never);
      alertEventsRepo.findFirstBySourceAndStatuses.mockResolvedValue(
        mockAlert as never,
      );
      alertEventsService.resolve.mockResolvedValue(updatedAlert as never);

      const result = await service.resolveAlert(
        { organizationId: mockOrgId, userId: 'user-1' },
        mockItemId,
        'Fixed the issue',
      );

      expect(itemsRepo.findById).toHaveBeenCalledWith(mockOrgId, mockItemId);
      expect(alertEventsRepo.findFirstBySourceAndStatuses).toHaveBeenCalledWith(
        mockOrgId,
        'CHECKLIST_RUN_ITEM',
        mockItemId,
        [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED],
      );
      expect(alertEventsService.resolve).toHaveBeenCalledWith(
        { organizationId: mockOrgId, userId: 'user-1' },
        mockAlertId,
        'Fixed the issue',
      );
      expect(result).toEqual(updatedAlert);
    });

    it('passes undefined resolutionNote when not provided', async () => {
      const mockAlert = { id: mockAlertId, status: AlertStatus.OPEN };
      const updatedAlert = { id: mockAlertId, status: AlertStatus.RESOLVED };

      itemsRepo.findById.mockResolvedValue({ id: mockItemId } as never);
      alertEventsRepo.findFirstBySourceAndStatuses.mockResolvedValue(
        mockAlert as never,
      );
      alertEventsService.resolve.mockResolvedValue(updatedAlert as never);

      await service.resolveAlert(
        { organizationId: mockOrgId, userId: 'user-1' },
        mockItemId,
      );

      expect(alertEventsService.resolve).toHaveBeenCalledWith(
        { organizationId: mockOrgId, userId: 'user-1' },
        mockAlertId,
        undefined,
      );
    });

    it('throws NotFoundException when item not found', async () => {
      itemsRepo.findById.mockResolvedValue(null);

      await expect(
        service.resolveAlert(
          { organizationId: mockOrgId, userId: 'user-1' },
          mockItemId,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(alertEventsRepo.findFirstBySourceAndStatuses).not.toHaveBeenCalled();
      expect(alertEventsService.resolve).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when no actionable alert exists', async () => {
      itemsRepo.findById.mockResolvedValue({ id: mockItemId } as never);
      alertEventsRepo.findFirstBySourceAndStatuses.mockResolvedValue(null);

      await expect(
        service.resolveAlert(
          { organizationId: mockOrgId, userId: 'user-1' },
          mockItemId,
        ),
      ).rejects.toThrow(
        'No OPEN or ACKNOWLEDGED alert found for this checklist run item',
      );

      expect(alertEventsService.resolve).not.toHaveBeenCalled();
    });
  });
});
