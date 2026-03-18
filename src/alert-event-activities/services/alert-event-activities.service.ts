import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertEventActivityType, AlertStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { AlertEventActivitiesRepository } from '../repositories/alert-event-activities.repository';
import { AlertEventsRepository } from '../../alert-events/repositories/alert-events.repository';

@Injectable()
export class AlertEventActivitiesService {
  constructor(
    private readonly repo: AlertEventActivitiesRepository,
    private readonly alertEventsRepo: AlertEventsRepository,
  ) {}

  /**
   * List activities for an alert. Enforces organizationId scoping.
   */
  async listForAlert(
    organizationId: string,
    alertEventId: string,
  ): Promise<
    Array<{
      id: string;
      type: string;
      actorUserId: string | null;
      fromStatus: string | null;
      toStatus: string | null;
      fromAssignedToUserId: string | null;
      toAssignedToUserId: string | null;
      comment: string | null;
      metadata: unknown;
      createdAt: string;
    }>
  > {
    const alert = await this.alertEventsRepo.findById(organizationId, alertEventId);
    if (!alert) throw new NotFoundException('Alert event not found');

    const rows = await this.repo.findByAlertId(organizationId, alertEventId);
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      actorUserId: r.actorUserId,
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      fromAssignedToUserId: r.fromAssignedToUserId,
      toAssignedToUserId: r.toAssignedToUserId,
      comment: r.comment,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /**
   * Log CREATED activity. Call after alert is successfully created.
   */
  async logCreated(
    organizationId: string,
    alertEventId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.repo.create(
      {
        organizationId,
        alertEventId,
        type: AlertEventActivityType.CREATED,
        toStatus: AlertStatus.OPEN,
      },
      tx,
    );
  }

  /**
   * Log ACKNOWLEDGED activity. Call after alert is successfully acknowledged.
   */
  async logAcknowledged(
    organizationId: string,
    alertEventId: string,
    fromStatus: AlertStatus,
    toStatus: AlertStatus,
    actorUserId: string | null,
    tx?: Prisma.TransactionClient,
  ) {
    return this.repo.create(
      {
        organizationId,
        alertEventId,
        type: AlertEventActivityType.ACKNOWLEDGED,
        actorUserId,
        fromStatus,
        toStatus,
      },
      tx,
    );
  }

  /**
   * Log RESOLVED activity. Call after alert is successfully resolved.
   */
  async logResolved(
    organizationId: string,
    alertEventId: string,
    fromStatus: AlertStatus,
    toStatus: AlertStatus,
    actorUserId: string | null,
    comment?: string | null,
    tx?: Prisma.TransactionClient,
  ) {
    return this.repo.create(
      {
        organizationId,
        alertEventId,
        type: AlertEventActivityType.RESOLVED,
        actorUserId,
        fromStatus,
        toStatus,
        comment: comment ?? null,
      },
      tx,
    );
  }

  /**
   * Log REOPENED activity. Call after alert is successfully reopened (RESOLVED -> OPEN).
   */
  async logReopened(
    organizationId: string,
    alertEventId: string,
    actorUserId: string | null,
    tx?: Prisma.TransactionClient,
  ) {
    return this.repo.create(
      {
        organizationId,
        alertEventId,
        type: AlertEventActivityType.REOPENED,
        actorUserId,
        fromStatus: AlertStatus.RESOLVED,
        toStatus: AlertStatus.OPEN,
      },
      tx,
    );
  }

  /**
   * Log assignment change. Decides ASSIGNED/UNASSIGNED/REASSIGNED based on before/after.
   * Call after assign or unassign is successful.
   */
  async logAssignmentChanged(
    organizationId: string,
    alertEventId: string,
    fromAssignedToUserId: string | null,
    toAssignedToUserId: string | null,
    actorUserId: string | null,
    tx?: Prisma.TransactionClient,
  ) {
    const type = this.resolveAssignmentActivityType(
      fromAssignedToUserId,
      toAssignedToUserId,
    );
    return this.repo.create(
      {
        organizationId,
        alertEventId,
        type,
        actorUserId,
        fromAssignedToUserId,
        toAssignedToUserId,
      },
      tx,
    );
  }

  private resolveAssignmentActivityType(
    fromAssignedToUserId: string | null,
    toAssignedToUserId: string | null,
  ): AlertEventActivityType {
    if (fromAssignedToUserId == null && toAssignedToUserId != null) {
      return AlertEventActivityType.ASSIGNED;
    }
    if (fromAssignedToUserId != null && toAssignedToUserId == null) {
      return AlertEventActivityType.UNASSIGNED;
    }
    return AlertEventActivityType.REASSIGNED;
  }
}
