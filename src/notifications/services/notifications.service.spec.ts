import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { NotificationDeliveryService } from './notification-delivery.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: jest.Mocked<NotificationsRepository>;
  let delivery: jest.Mocked<Pick<NotificationDeliveryService, 'deliver'>>;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn().mockResolvedValue({
        id: 'n1',
        userId: 'user-1',
        organizationId: 'org-1',
        type: 'ESCALATION_ASSIGNED',
        payloadJson: { message: 'Assigned' },
      }),
      findByDedupeKey: jest.fn().mockResolvedValue(null),
    };

    delivery = { deliver: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationsRepository, useValue: mockRepo },
        { provide: NotificationDeliveryService, useValue: delivery },
      ],
    }).compile();

    service = module.get(NotificationsService);
    repo = module.get(NotificationsRepository);
  });

  it('creates notification when dedupeKey does not exist', async () => {
    await service.createNotification('org-1', {
      type: 'ESCALATION_ASSIGNED',
      userIds: ['user-1'],
      sourceType: 'ALERT_EVENT',
      sourceId: 'alert-1',
      payload: { message: 'Assigned' },
      dedupeKey: 'ESCALATION_ASSIGNED:alert-1:user-1',
    });

    expect(repo.findByDedupeKey).toHaveBeenCalledWith('ESCALATION_ASSIGNED:alert-1:user-1');
    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(delivery.deliver).toHaveBeenCalledTimes(1);
    expect(delivery.deliver).toHaveBeenCalledWith([expect.objectContaining({ id: 'n1', userId: 'user-1' })]);
  });

  it('skips creation when dedupeKey already exists', async () => {
    repo.findByDedupeKey.mockResolvedValue({ id: 'existing' } as never);

    await service.createNotification('org-1', {
      type: 'ESCALATION_RESOLVED',
      userIds: ['user-1'],
      sourceType: 'ALERT_EVENT',
      sourceId: 'alert-1',
      payload: { message: 'Resolved' },
      dedupeKey: 'ESCALATION_RESOLVED:alert-1:user-1',
    });

    expect(repo.findByDedupeKey).toHaveBeenCalledWith('ESCALATION_RESOLVED:alert-1:user-1');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('creates nothing when userIds is empty', async () => {
    await service.createNotification('org-1', {
      type: 'ESCALATION_CREATED',
      userIds: [],
      sourceType: 'ALERT_EVENT',
      sourceId: 'alert-1',
      payload: { message: 'Created' },
      dedupeKey: 'ESCALATION_CREATED:alert-1',
    });

    expect(repo.findByDedupeKey).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
    expect(delivery.deliver).not.toHaveBeenCalled();
  });
});
