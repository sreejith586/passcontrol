import { IsArray, ArrayMinSize, ValidateNested, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '@prisma/client';
import { PREFERENCE_SUPPORTED_TYPES } from '../constants/notification-types';

class PreferenceItemDto {
  @IsIn(PREFERENCE_SUPPORTED_TYPES, {
    message: `notificationType must be one of: ${PREFERENCE_SUPPORTED_TYPES.join(', ')}`,
  })
  notificationType: NotificationType;

  @IsBoolean()
  inAppEnabled: boolean;

  @IsBoolean()
  emailEnabled: boolean;

  @IsBoolean()
  whatsAppEnabled: boolean;
}

export class PutPreferencesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one preference item is required' })
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  items: PreferenceItemDto[];
}
