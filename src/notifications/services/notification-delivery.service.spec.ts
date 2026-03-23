import { Test, TestingModule } from '@nestjs/testing';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationDeliveryRepository } from '../repositories/notification-delivery.repository';
import { EmailChannelService } from '../mail/email-channel.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

describe('NotificationDeliveryService', () => {
  let service: NotificationDeliveryService;
  let preferences: jest.Mocked<Pick<NotificationPreferencesService, 'getEffectivePreferencesForUser'>>;
  let deliveryRepo: jest.Mocked<Pick<NotificationDeliveryRepository, 'create' | 'updateStatus'>>;
  let emailChannel: jest.Mocked<Pick<EmailChannelService, 'send'>>;
  let userFindUnique: jest.Mock;

  const createdNotif = {
    id: 'n1',
    userId: 'user-1',
    organizationId: 'org-1',
    type: 'ESCALATION_ASSIGNED' as const,
    payload: { alertEventId: 'alert-1', message: 'Assigned to you' },
  };

  beforeEach(async () => {
    preferences = {
      getEffectivePreferencesForUser: jest.fn().mockResolvedValue([
        { notificationType: 'ESCALATION_ASSIGNED', inAppEnabled: true, emailEnabled: true, whatsAppEnabled: false },
      ]),
    };

    deliveryRepo = {
      create: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'd1', ...d })),
      updateStatus: jest.fn().mockResolvedValue({}),
    };

    emailChannel = {
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
    };

    userFindUnique = jest.fn().mockResolvedValue({ email: 'user@example.com' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDeliveryService,
        { provide: NotificationPreferencesService, useValue: preferences },
        { provide: NotificationDeliveryRepository, useValue: deliveryRepo },
        { provide: EmailChannelService, useValue: emailChannel },
        { provide: PrismaService, useValue: { user: { findUnique: userFindUnique } } as unknown as PrismaService },
      ],
    }).compile();

    service = module.get(NotificationDeliveryService);
  });

  it('creates IN_APP delivery and sends email when preference emailEnabled is true', async () => {
    await service.deliver([createdNotif]);

    expect(deliveryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: 'n1',
        channel: 'IN_APP',
        status: 'SENT',
        recipient: 'in-app',
      }),
    );

    expect(deliveryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: 'n1',
        channel: 'EMAIL',
        status: 'PENDING',
        recipient: 'user@example.com',
      }),
    );

    expect(emailChannel.send).toHaveBeenCalledWith(
      'user@example.com',
      'ESCALATION_ASSIGNED',
      expect.objectContaining({ alertEventId: 'alert-1' }),
    );

    expect(deliveryRepo.updateStatus).toHaveBeenCalledWith(
      'd1',
      expect.objectContaining({ status: 'SENT', sentAt: expect.any(Date) }),
    );
  });

  it('skips email and creates SKIPPED record when emailEnabled is false', async () => {
    preferences.getEffectivePreferencesForUser.mockResolvedValue([
      { notificationType: 'ESCALATION_ASSIGNED', inAppEnabled: true, emailEnabled: false, whatsAppEnabled: false },
    ]);

    await service.deliver([createdNotif]);

    expect(deliveryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'EMAIL',
        status: 'SKIPPED',
        recipient: '(preference off)',
      }),
    );
    expect(emailChannel.send).not.toHaveBeenCalled();
  });

  it('creates SKIPPED when user has no email', async () => {
    userFindUnique.mockResolvedValue({ email: null });

    await service.deliver([createdNotif]);

    expect(deliveryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'EMAIL',
        status: 'SKIPPED',
        recipient: '(no email)',
      }),
    );
    expect(emailChannel.send).not.toHaveBeenCalled();
  });

  it('marks EMAIL delivery as FAILED when send fails', async () => {
    emailChannel.send.mockResolvedValue({ success: false, error: 'SMTP connection refused' });

    await service.deliver([createdNotif]);

    expect(deliveryRepo.updateStatus).toHaveBeenCalledWith(
      'd1',
      expect.objectContaining({
        status: 'FAILED',
        errorMessage: 'SMTP connection refused',
      }),
    );
  });
});
