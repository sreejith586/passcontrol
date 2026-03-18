import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ALERT_COMMENT_BODY_MAX_LENGTH } from '../../alert-event-comments/dto/create-alert-event-comment.dto';

export class ReopenAlertDto {
  @ApiPropertyOptional({
    description: 'Note explaining why the alert was reopened (required when org policy enabled)',
    maxLength: ALERT_COMMENT_BODY_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(ALERT_COMMENT_BODY_MAX_LENGTH, {
    message: `Note cannot exceed ${ALERT_COMMENT_BODY_MAX_LENGTH} characters`,
  })
  note?: string;
}
