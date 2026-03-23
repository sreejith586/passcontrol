import { Injectable, BadRequestException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { UserNotificationPreferenceRepository } from '../repositories/user-notification-preference.repository';
import { PREFERENCE_SUPPORTED_TYPES } from '../constants/notification-types';
import type { TenantContext } from '../../access/decorators/current-tenant.decorator';

/**
 * Default behavior when no preference row exists for a notification type.
 * - inAppEnabled: true (in-app is the foundation)
 * - emailEnabled: true (email on by default for all types until delivery is implemented)
 * - whatsAppEnabled: false (WhatsApp off until opted in)
 */
const DEFAULT_PREFERENCES = {
  inAppEnabled: true,
  emailEnabled: true,
  whatsAppEnabled: false,
} as const;

export interface EffectivePreference {
  notificationType: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  whatsAppEnabled: boolean;
}

export interface PreferenceItemInput {
  notificationType: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  whatsAppEnabled: boolean;
}

@Injectable()
export class NotificationPreferencesService {
  constructor(
    private readonly repo: UserNotificationPreferenceRepository,
  ) {}

  /**
   * Returns effective preferences for all supported notification types.
   * Uses DEFAULT_PREFERENCES when no row exists.
   * For use by NotificationDeliveryService (future) and GET /notifications/preferences.
   */
  async getEffectivePreferencesForUser(
    userId: string,
    organizationId: string,
  ): Promise<EffectivePreference[]> {
    const rows = await this.repo.findByUserAndOrg(userId, organizationId);
    const byType = new Map<NotificationType, EffectivePreference>();
    for (const r of rows) {
      byType.set(r.notificationType, {
        notificationType: r.notificationType,
        inAppEnabled: r.inAppEnabled,
        emailEnabled: r.emailEnabled,
        whatsAppEnabled: r.whatsAppEnabled,
      });
    }
    return PREFERENCE_SUPPORTED_TYPES.map((type) => {
      const existing = byType.get(type);
      return existing ?? {
        notificationType: type,
        ...DEFAULT_PREFERENCES,
      };
    });
  }

  /**
   * GET /notifications/preferences - effective preferences for current user.
   */
  async getPreferences(ctx: TenantContext): Promise<{ items: EffectivePreference[] }> {
    if (!ctx.userId) {
      throw new BadRequestException('User context is required');
    }
    const items = await this.getEffectivePreferencesForUser(
      ctx.userId,
      ctx.organizationId,
    );
    return { items };
  }

  /**
   * PUT /notifications/preferences - upsert preferences for current user.
   * Validates notification types and booleans.
   */
  async putPreferences(
    ctx: TenantContext,
    items: PreferenceItemInput[],
  ): Promise<{ items: EffectivePreference[] }> {
    if (!ctx.userId) {
      throw new BadRequestException('User context is required');
    }

    const validTypes = new Set(PREFERENCE_SUPPORTED_TYPES);
    for (const item of items) {
      if (!validTypes.has(item.notificationType)) {
        throw new BadRequestException(
          `Unsupported notification type: ${item.notificationType}`,
        );
      }
      if (
        typeof item.inAppEnabled !== 'boolean' ||
        typeof item.emailEnabled !== 'boolean' ||
        typeof item.whatsAppEnabled !== 'boolean'
      ) {
        throw new BadRequestException(
          'inAppEnabled, emailEnabled, and whatsAppEnabled must be booleans',
        );
      }
    }

    for (const item of items) {
      await this.repo.upsert(ctx.userId, ctx.organizationId, item.notificationType, {
        inAppEnabled: item.inAppEnabled,
        emailEnabled: item.emailEnabled,
        whatsAppEnabled: item.whatsAppEnabled,
      });
    }

    return this.getPreferences(ctx);
  }
}
