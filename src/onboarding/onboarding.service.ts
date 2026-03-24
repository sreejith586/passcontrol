import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { OrganizationTenantType } from '@prisma/client';
import { ChecklistItemSeverity } from '../checklists/enums/checklist-item-severity.enum';
import { ChecklistTemplatesService } from '../checklists/templates/services/checklist-templates.service';
import { ChecklistSchedulesService } from '../checklists/schedules/services/checklist-schedules.service';
import { ChecklistRunsService } from '../checklists/runs/services/checklist-runs.service';
import { PrismaService } from '../infra/prisma/prisma.service';
import { RegionalSettingsResolverService } from '../common/services/regional-settings-resolver.service';

const QUICK_SETUP_TEMPLATE_KEY = 'quick-setup-starter';

/** One-click demo sample: stable key for idempotency and empty-org checks. */
const DEMO_WORKSPACE_TEMPLATE_KEY = 'demo-workspace-sample';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly templates: ChecklistTemplatesService,
    private readonly schedules: ChecklistSchedulesService,
    private readonly checklistRuns: ChecklistRunsService,
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
    tenantType: OrganizationTenantType;
    demoWorkspaceAvailable: boolean;
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
        select: { isSelfOnboarded: true, tenantType: true },
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

    const isSelfOnboarded = org?.isSelfOnboarded ?? false;
    const tenantType = org?.tenantType ?? OrganizationTenantType.STANDARD;
    const emptyWorkspace =
      templateCount === 0 && scheduleCount === 0 && checklistRunCount === 0;
    const demoWorkspaceAvailable =
      isSelfOnboarded &&
      tenantType === OrganizationTenantType.DEMO &&
      emptyWorkspace;

    return {
      isSelfOnboarded,
      tenantType,
      demoWorkspaceAvailable,
      emailVerifiedAt: user?.emailVerifiedAt?.toISOString() ?? null,
      templateCount,
      scheduleCount,
      orgMemberCount: memberRows.length,
      checklistRunCount,
    };
  }

  /**
   * Provisions a minimal sample workspace for eligible DEMO self-onboarded orgs (empty checklist data).
   * Idempotent: returns existing run when demo template + run already exist.
   */
  async demoWorkspaceSetup(ctx: {
    organizationId: string;
    userId?: string;
  }): Promise<{
    runId: string;
    alreadyInitialized: boolean;
    message: string;
  }> {
    if (!ctx.userId) {
      throw new UnauthorizedException();
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { isSelfOnboarded: true, tenantType: true },
    });

    if (
      !org?.isSelfOnboarded ||
      org.tenantType !== OrganizationTenantType.DEMO
    ) {
      throw new ForbiddenException(
        'Sample workspace is only available for demo organizations created through self-service signup.',
      );
    }

    const templateCount = await this.prisma.checklistTemplate.count({
      where: { organizationId: ctx.organizationId, isLatest: true },
    });
    const scheduleCount = await this.prisma.checklistSchedule.count({
      where: { organizationId: ctx.organizationId },
    });
    const runCount = await this.prisma.checklistRun.count({
      where: { organizationId: ctx.organizationId },
    });

    const demoTemplate = await this.prisma.checklistTemplate.findFirst({
      where: {
        organizationId: ctx.organizationId,
        templateKey: DEMO_WORKSPACE_TEMPLATE_KEY,
        status: 'PUBLISHED',
      },
      select: { id: true },
    });

    if (demoTemplate) {
      const existingRun = await this.prisma.checklistRun.findFirst({
        where: {
          organizationId: ctx.organizationId,
          checklistTemplateId: demoTemplate.id,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (existingRun) {
        return {
          runId: existingRun.id,
          alreadyInitialized: true,
          message: 'Sample workspace is already loaded.',
        };
      }
    }

    const workspaceEmpty =
      templateCount === 0 && scheduleCount === 0 && runCount === 0;
    if (!workspaceEmpty) {
      throw new ConflictException(
        'This workspace already has checklist data. Sample workspace can only be loaded before you add templates, schedules, or runs.',
      );
    }

    const { timezone } = await this.regionalSettings.resolveRegionalSettings(
      ctx.organizationId,
    );

    const brand = await this.prisma.brand.create({
      data: {
        organizationId: ctx.organizationId,
        name: 'Demo Operations',
      },
    });
    const location = await this.prisma.location.create({
      data: {
        organizationId: ctx.organizationId,
        brandId: brand.id,
        name: 'Main site',
        timezone,
      },
    });
    const zone = await this.prisma.zone.create({
      data: {
        organizationId: ctx.organizationId,
        locationId: location.id,
        name: 'Floor',
      },
    });

    const draft = await this.templates.create(ctx, {
      templateKey: DEMO_WORKSPACE_TEMPLATE_KEY,
      name: 'Opening readiness',
      description:
        'Sample checklist to explore runs and alerts in your demo workspace.',
      brandId: brand.id,
      locationId: location.id,
      zoneId: zone.id,
      sections: [
        {
          title: 'Pre-shift checks',
          sortOrder: 0,
          items: [
            {
              itemType: 'BOOLEAN',
              label: 'Service areas clean and stocked',
              isRequired: true,
              sortOrder: 0,
              severity: ChecklistItemSeverity.MEDIUM,
            },
            {
              itemType: 'BOOLEAN',
              label: 'Cold-hold equipment within safe range',
              isRequired: true,
              sortOrder: 1,
              severity: ChecklistItemSeverity.HIGH,
            },
          ],
        },
      ],
    });

    await this.templates.publish(ctx, draft.id);

    const schedule = await this.schedules.create(ctx, {
      checklistTemplateId: draft.id,
      name: 'Daily opening review',
      timezone,
      rrule: 'FREQ=DAILY;BYHOUR=8;BYMINUTE=0',
      brandId: brand.id,
      locationId: location.id,
      zoneId: zone.id,
    });

    const dueAt = DateTime.now().setZone(timezone).endOf('day').toISO();
    const run = await this.schedules.generateRun(ctx, schedule.id, {
      dueAt: dueAt ?? undefined,
    });

    const itemRows = await this.prisma.checklistRunItemSnapshot.findMany({
      where: { checklistRunId: run.id },
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    });
    const itemToFail = itemRows.length >= 2 ? itemRows[1] : itemRows[0];
    if (itemToFail) {
      await this.checklistRuns.updateRunItem(ctx, itemToFail.id, {
        result: 'FAIL',
        comment: 'Sample failure to demonstrate alerts',
      });
    }

    return {
      runId: run.id,
      alreadyInitialized: false,
      message: 'Sample workspace loaded. Open the run to review items and alerts.',
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
