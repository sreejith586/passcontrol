import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AlertEventCommentsRepository } from '../repositories/alert-event-comments.repository';
import { AlertEventsRepository } from '../../alert-events/repositories/alert-events.repository';
import {
  CreateAlertEventCommentDto,
  ALERT_COMMENT_BODY_MAX_LENGTH,
} from '../dto/create-alert-event-comment.dto';

@Injectable()
export class AlertEventCommentsService {
  constructor(
    private readonly repo: AlertEventCommentsRepository,
    private readonly alertEventsRepo: AlertEventsRepository,
  ) {}

  /**
   * Add a comment or resolution note to an alert. Verifies alert exists in the same organization.
   */
  async addComment(
    organizationId: string,
    alertEventId: string,
    authorUserId: string,
    dto: CreateAlertEventCommentDto,
  ) {
    const alert = await this.alertEventsRepo.findById(organizationId, alertEventId);
    if (!alert) throw new NotFoundException('Alert event not found');

    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Body cannot be empty or whitespace-only');
    }

    if (body.length > ALERT_COMMENT_BODY_MAX_LENGTH) {
      throw new BadRequestException(
        `Body cannot exceed ${ALERT_COMMENT_BODY_MAX_LENGTH} characters`,
      );
    }

    const created = await this.repo.create({
      organizationId,
      alertEventId,
      authorUserId,
      type: dto.type,
      body,
    });

    return {
      id: created.id,
      authorUserId: created.authorUserId,
      type: created.type,
      body: created.body,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * List comments for an alert. Verifies alert exists in the same organization.
   * Returns oldest-first.
   */
  async listForAlert(
    organizationId: string,
    alertEventId: string,
  ): Promise<
    Array<{
      id: string;
      authorUserId: string | null;
      type: string;
      body: string;
      createdAt: string;
    }>
  > {
    const alert = await this.alertEventsRepo.findById(organizationId, alertEventId);
    if (!alert) throw new NotFoundException('Alert event not found');

    const rows = await this.repo.findByAlertId(organizationId, alertEventId);
    return rows.map((r) => ({
      id: r.id,
      authorUserId: r.authorUserId,
      type: r.type,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
