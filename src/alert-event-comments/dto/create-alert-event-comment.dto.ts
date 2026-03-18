import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AlertEventCommentType } from '@prisma/client';

export const ALERT_COMMENT_BODY_MAX_LENGTH = 4000;

export class CreateAlertEventCommentDto {
  @ApiProperty({
    enum: ['COMMENT', 'RESOLUTION_NOTE'],
    description: 'Type of comment',
  })
  @IsEnum(AlertEventCommentType)
  type!: AlertEventCommentType;

  @ApiProperty({
    description: 'Comment body (trimmed, non-blank, max 4000 chars)',
    minLength: 1,
    maxLength: ALERT_COMMENT_BODY_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Body cannot be empty or whitespace-only' })
  @MaxLength(ALERT_COMMENT_BODY_MAX_LENGTH, {
    message: `Body cannot exceed ${ALERT_COMMENT_BODY_MAX_LENGTH} characters`,
  })
  body!: string;
}
