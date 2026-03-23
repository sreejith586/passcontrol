import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UserNotificationPreferenceRepository } from '../repositories/user-notification-preference.repository';
import { PREFERENCE_SUPPORTED_TYPES } from '../constants/notification-types';

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;
  let repo: jest.Mocked<UserNotificationPreferenceRepository>;

  const ctx = (userId: string, orgId: string) => ({
    userId,
    organizationId: orgId,
  });

  beforeEach(async () => {
    const mockRepo = {
      findByUserAndOrg: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferencesService,
        { provide: UserNotificationPreferenceRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(NotificationPreferencesService);
    repo = module.get(UserNotificationPreferenceRepository);
  });

  describe('default preferences when no rows exist', () => {
    it('returns default preferences for all supported types', async () => {
      repo.findByUserAndOrg.mockResolvedValue([]);

      const result = await service.getEffectivePreferencesForUser('user-1', 'org-1');

      expect(result).toHaveLength(PREFERENCE_SUPPORTED_TYPES.length);
      for (const item of result) {
        expect(item.inAppEnabled).toBe(true);
        expect(item.emailEnabled).toBe(true);
        expect(item.whatsAppEnabled).toBe(false);
        expect(PREFERENCE_SUPPORTED_TYPES).toContain(item.notificationType);
      }
    });

    it('getPreferences returns same defaults for user with no saved preferences', async () => {
      repo.findByUserAndOrg.mockResolvedValue([]);

      const result = await service.getPreferences(ctx('user-1', 'org-1'));

      expect(result.items).toHaveLength(PREFERENCE_SUPPORTED_TYPES.length);
      result.items.forEach((item) => {
        expect(item.inAppEnabled).toBe(true);
        expect(item.emailEnabled).toBe(true);
        expect(item.whatsAppEnabled).toBe(false);
      });
    });
  });

  describe('upsert/update behavior', () => {
    it('upserts and returns overridden preferences', async () => {
      repo.findByUserAndOrg.mockResolvedValue([
        {
          id: 'p1',
          notificationType: 'ESCALATION_ASSIGNED',
          inAppEnabled: true,
          emailEnabled: false,
          whatsAppEnabled: true,
        },
      ]);

      const result = await service.putPreferences(ctx('user-1', 'org-1'), [
        { notificationType: 'ESCALATION_ASSIGNED', inAppEnabled: true, emailEnabled: false, whatsAppEnabled: true },
        { notificationType: 'CHECKLIST_DUE_SOON', inAppEnabled: true, emailEnabled: true, whatsAppEnabled: false },
      ]);

      expect(repo.upsert).toHaveBeenCalledTimes(2);
      expect(repo.upsert).toHaveBeenCalledWith(
        'user-1',
        'org-1',
        'ESCALATION_ASSIGNED',
        { inAppEnabled: true, emailEnabled: false, whatsAppEnabled: true },
      );
      expect(repo.upsert).toHaveBeenCalledWith(
        'user-1',
        'org-1',
        'CHECKLIST_DUE_SOON',
        { inAppEnabled: true, emailEnabled: true, whatsAppEnabled: false },
      );

      expect(result.items).toHaveLength(PREFERENCE_SUPPORTED_TYPES.length);
      const assigned = result.items.find((i) => i.notificationType === 'ESCALATION_ASSIGNED');
      expect(assigned).toEqual({
        notificationType: 'ESCALATION_ASSIGNED',
        inAppEnabled: true,
        emailEnabled: false,
        whatsAppEnabled: true,
      });
    });
  });

  describe('org scoping', () => {
    it('getEffectivePreferencesForUser returns org-specific preferences', async () => {
      repo.findByUserAndOrg.mockImplementation(async (userId, orgId) => {
        if (orgId === 'org-1') {
          return [
            {
              id: 'p1',
              notificationType: 'ESCALATION_ASSIGNED',
              inAppEnabled: false,
              emailEnabled: false,
              whatsAppEnabled: false,
            },
          ];
        }
        return [];
      });

      const org1 = await service.getEffectivePreferencesForUser('user-1', 'org-1');
      const org2 = await service.getEffectivePreferencesForUser('user-1', 'org-2');

      const assignedOrg1 = org1.find((i) => i.notificationType === 'ESCALATION_ASSIGNED');
      const assignedOrg2 = org2.find((i) => i.notificationType === 'ESCALATION_ASSIGNED');

      expect(assignedOrg1?.inAppEnabled).toBe(false);
      expect(assignedOrg2?.inAppEnabled).toBe(true);
    });
  });

  describe('invalid notification type rejection', () => {
    it('putPreferences rejects unsupported notification type', async () => {
      await expect(
        service.putPreferences(ctx('user-1', 'org-1'), [
          {
            notificationType: 'INVALID_TYPE' as never,
            inAppEnabled: true,
            emailEnabled: true,
            whatsAppEnabled: false,
          },
        ]),
      ).rejects.toThrow(BadRequestException);

      expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('putPreferences rejects non-boolean values', async () => {
      await expect(
        service.putPreferences(ctx('user-1', 'org-1'), [
          {
            notificationType: 'ESCALATION_ASSIGNED',
            inAppEnabled: 'true' as never,
            emailEnabled: true,
            whatsAppEnabled: false,
          },
        ]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('user context validation', () => {
    it('getPreferences throws when userId is missing', async () => {
      await expect(
        service.getPreferences({ organizationId: 'org-1', userId: undefined }),
      ).rejects.toThrow(BadRequestException);
    });

    it('putPreferences throws when userId is missing', async () => {
      await expect(
        service.putPreferences(
          { organizationId: 'org-1', userId: undefined },
          [{ notificationType: 'ESCALATION_ASSIGNED', inAppEnabled: true, emailEnabled: true, whatsAppEnabled: false }],
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
