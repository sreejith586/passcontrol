import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistSchedulesService } from './checklist-schedules.service';
import { ChecklistSchedulesRepository } from '../repositories/checklist-schedules.repository';
import { ChecklistScheduleRecurrenceService } from './checklist-schedule-recurrence.service';
import { AuditLogsService } from '../../../audit/services/audit-logs.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';

describe('ChecklistSchedulesService', () => {
  let service: ChecklistSchedulesService;
  let prisma: jest.Mocked<Pick<PrismaService, '$transaction' | 'checklistRun' | 'checklistTemplate'>>;
  let repo: jest.Mocked<ChecklistSchedulesRepository>;

  const orgId = 'org-123';
  const scheduleId = 'schedule-456';
  const templateId = 'template-789';

  const mockSchedule = {
    id: scheduleId,
    organizationId: orgId,
    checklistTemplateId: templateId,
    name: 'Daily',
    rrule: 'FREQ=DAILY;BYHOUR=6',
    timezone: 'UTC',
    brandId: null,
    locationId: null,
    zoneId: null,
    startsAt: null,
    endsAt: null,
    isActive: true,
    nextRunAt: new Date('2025-03-17T06:00:00Z'),
    nextGenerationAttemptAt: null,
    lastGenerationAttemptAt: null,
    lastGenerationStatus: null,
    lastGenerationError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    checklistTemplate: {
      id: templateId,
      templateKey: 'daily',
      name: 'Daily',
      version: 1,
      status: 'PUBLISHED',
    },
  };

  const mockTemplate = {
    id: templateId,
    organizationId: orgId,
    templateKey: 'daily',
    name: 'Daily',
    version: 1,
    status: 'PUBLISHED',
    sections: [
      {
        id: 'sec-1',
        title: 'Section',
        description: null,
        sortOrder: 0,
        items: [
          {
            id: 'item-1',
            itemType: 'BOOLEAN',
            label: 'Item 1',
            helpText: null,
            isRequired: true,
            requiresEvidenceOnFail: false,
            requiresCommentOnFail: false,
            severity: 'MEDIUM',
            failureCreatesIncident: false,
            configJson: null,
            sortOrder: 0,
          },
        ],
      },
    ],
  };

  const mockCreatedRun = {
    id: 'run-new',
    organizationId: orgId,
    checklistTemplateId: templateId,
    checklistScheduleId: scheduleId,
    runNumber: 42,
    status: 'PENDING',
    sectionSnapshots: [],
    itemSnapshots: [],
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      checklistRun: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      checklistTemplate: {
        findFirst: jest.fn().mockResolvedValue(mockTemplate),
      },
    } as unknown as jest.Mocked<Pick<PrismaService, '$transaction' | 'checklistRun' | 'checklistTemplate'>>;

    repo = {
      findById: jest.fn().mockResolvedValue(mockSchedule),
    } as unknown as jest.Mocked<ChecklistSchedulesRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistSchedulesService,
        { provide: ChecklistSchedulesRepository, useValue: repo },
        { provide: ChecklistScheduleRecurrenceService, useValue: { computeNextRunAt: jest.fn() } },
        { provide: AuditLogsService, useValue: { recordWrite: jest.fn() } },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ChecklistSchedulesService);
  });

  describe('generateRunCore', () => {
    it('acquires advisory lock before aggregate and create (concurrency-safe)', async () => {
      const txMock = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        checklistRun: {
          aggregate: jest.fn().mockResolvedValue({ _max: { runNumber: 41 } }),
          create: jest.fn().mockResolvedValue(mockCreatedRun),
          findUniqueOrThrow: jest.fn().mockResolvedValue(mockCreatedRun),
        },
        checklistRunSectionSnapshot: { create: jest.fn().mockResolvedValue({}) },
        checklistRunItemSnapshot: { create: jest.fn().mockResolvedValue({}) },
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof txMock) => unknown) =>
        fn(txMock),
      );

      const result = await service.generateRunCore(orgId, scheduleId);

      expect('skipped' in result).toBe(false);
      expect(result).toHaveProperty('run');

      expect(txMock.$executeRaw).toHaveBeenCalledTimes(1);
      const rawCall = txMock.$executeRaw.mock.calls[0][0];
      expect(String(rawCall)).toContain('pg_advisory_xact_lock');
      expect(String(rawCall)).toContain('hashtext');

      expect(txMock.checklistRun.aggregate).toHaveBeenCalledWith({
        where: { organizationId: orgId },
        _max: { runNumber: true },
      });

      expect(txMock.checklistRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            runNumber: 42,
            organizationId: orgId,
          }),
        }),
      );
    });

    it('returns skipped duplicate when run exists for same day', async () => {
      (prisma.checklistRun.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

      const result = await service.generateRunCore(orgId, scheduleId);

      expect(result).toEqual({ skipped: 'duplicate' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
