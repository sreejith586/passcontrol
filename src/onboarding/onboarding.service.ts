import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { ChecklistTemplatesService } from '../checklists/templates/services/checklist-templates.service';
import { ChecklistSchedulesService } from '../checklists/schedules/services/checklist-schedules.service';
import { PrismaService } from '../infra/prisma/prisma.service';
import { RegionalSettingsResolverService } from '../common/services/regional-settings-resolver.service';

const QUICK_SETUP_TEMPLATE_KEY = 'quick-setup-starter';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly templates: ChecklistTemplatesService,
    private readonly schedules: ChecklistSchedulesService,
    private readonly prisma: PrismaService,
    private readonly regionalSettings: RegionalSettingsResolverService,
  ) {}

  /**
   * Dashboard first-run checklist: self-onboarded flag, verification, and org counts (no new DB fields).
   */
  async getFirstRunStatus(ctx: {
    organizationId: string;
    userId?: string;
  }): Promise<{
    isSelfOnboarded: boolean;
    emailVerifiedAt: string | null;
    templateCount: number;
    scheduleCount: number;
    orgMemberCount: number;
    checklistRunCount: number;
  }> {
    if (!ctx.userId) {
      throw new UnauthorizedException();
    }
    const orgId = ctx.organizationId;

    const [
      org,
      user,
      templateCount,
      scheduleCount,
      checklistRunCount,
      memberRows,
    ] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { isSelfOnboarded: true },
      }),
      this.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { emailVerifiedAt: true },
      }),
      this.prisma.checklistTemplate.count({
        where: { organizationId: orgId, isLatest: true },
      }),
      this.prisma.checklistSchedule.count({
        where: { organizationId: orgId },
      }),
      this.prisma.checklistRun.count({
        where: { organizationId: orgId },
      }),
      this.prisma.userRoleAssignment.findMany({
        where: {
          organizationId: orgId,
          user: { deletedAt: null },
        },
        distinct: ['userId'],
        select: { userId: true },
      }),
    ]);

    return {
      isSelfOnboarded: org?.isSelfOnboarded ?? false,
      emailVerifiedAt: user?.emailVerifiedAt?.toISOString() ?? null,
      templateCount,
      scheduleCount,
      orgMemberCount: memberRows.length,
      checklistRunCount,
    };
  }

  /**
   * Creates a starter template, schedule, and run for first-value onboarding.
   * Idempotent for template/schedule: reuses if quick-setup-starter exists.
   * Returns run ID for redirect.
   */
  async quickSetup(ctx: {
    organizationId: string;
    userId?: string;
  }): Promise<{ runId: string }> {
    let template = await this.prisma.checklistTemplate.findFirst({
      where: {
        organizationId: ctx.organizationId,
        templateKey: QUICK_SETUP_TEMPLATE_KEY,
        status: 'PUBLISHED',
      },
      select: { id: true },
    });

    if (!template) {
      const created = await this.templates.create(ctx, {
        templateKey: QUICK_SETUP_TEMPLATE_KEY,
        name: 'Quick inspection',
        description: 'Starter checklist for your first PassControl run',
        sections: [
          {
            title: 'Inspection',
            sortOrder: 0,
            items: [
              {
                itemType: 'BOOLEAN',
                label: 'Area is clean and ready',
                isRequired: true,
                sortOrder: 0,
              },
              {
                itemType: 'BOOLEAN',
                label: 'Equipment functioning correctly',
                isRequired: true,
                sortOrder: 1,
              },
              {
                itemType: 'BOOLEAN',
                label: 'No hazards observed',
                isRequired: true,
                sortOrder: 2,
              },
            ],
          },
        ],
      });
      await this.templates.publish(ctx, created.id);
      template = { id: created.id };
    }

    let schedule = await this.prisma.checklistSchedule.findFirst({
      where: {
        organizationId: ctx.organizationId,
        checklistTemplateId: template.id,
        isActive: true,
      },
      select: { id: true },
    });

    const { timezone } = await this.regionalSettings.resolveRegionalSettings(
      ctx.organizationId,
    );

    if (!schedule) {
      const created = await this.schedules.create(ctx, {
        checklistTemplateId: template.id,
        name: 'Daily quick inspection',
        timezone,
        rrule: 'FREQ=DAILY;BYHOUR=6;BYMINUTE=0',
      });
      schedule = { id: created.id };
    }

    const dueAt = DateTime.now().setZone(timezone).endOf('day').toISO();
    try {
      const run = await this.schedules.generateRun(ctx, schedule.id, {
        dueAt: dueAt ?? undefined,
      });
      return { runId: run.id };
    } catch (err) {
      if (
        err instanceof BadRequestException &&
        err.message?.includes('already exists')
      ) {
        const existing = await this.prisma.checklistRun.findFirst({
          where: {
            organizationId: ctx.organizationId,
            checklistScheduleId: schedule.id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (existing) return { runId: existing.id };
      }
      throw err;
    }
  }
}
