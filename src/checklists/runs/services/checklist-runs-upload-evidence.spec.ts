import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChecklistRunsService } from './checklist-runs.service';
import { ChecklistRunsRepository } from '../repositories/checklist-runs.repository';
import { AuditLogsService } from '../../../audit/services/audit-logs.service';
import { AlertEventsService } from '../../../alert-events/services/alert-events.service';
import {
  DOMAIN_EVENT_PUBLISHER,
} from '../../../common/domain-events/contracts/domain-event-publisher.interface';
import { AttachmentsService } from '../../../attachments/services/attachments.service';
import { FilesService } from '../../../files/services/files.service';
import { STORAGE_SERVICE } from '../../../files/storage/storage.interface';
import { TemperatureReadingsService } from '../../../temperature/services/temperature-readings.service';

describe('ChecklistRunsService (uploadEvidence)', () => {
  let service: ChecklistRunsService;
  let repo: jest.Mocked<ChecklistRunsRepository>;
  let filesService: jest.Mocked<FilesService>;
  let storage: { saveBytes?: jest.Mock };
  let attachmentsService: jest.Mocked<AttachmentsService>;

  const mockOrgId = 'org-1';
  const mockItemId = 'item-1';
  const mockRun = {
    id: 'run-1',
    organizationId: mockOrgId,
    status: 'IN_PROGRESS' as const,
    checklistRunSectionSnapshot: { id: 'sec-1', titleSnapshot: 'Section', sortOrder: 0 },
  };
  const mockItem = {
    id: mockItemId,
    organizationId: mockOrgId,
    checklistRunId: mockRun.id,
    checklistRun: mockRun,
  };
  const mockFile = {
    fieldname: 'file',
    originalname: 'photo.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('test'),
  };
  const mockFileRecord = { id: 'file-1', fileName: 'photo.jpg', mimeType: 'image/jpeg' };
  const mockAttachment = { id: 'att-1', fileId: 'file-1', file: mockFileRecord };

  beforeEach(async () => {
    storage = { saveBytes: jest.fn().mockResolvedValue(undefined) };
    attachmentsService = {
      create: jest.fn().mockResolvedValue(mockAttachment),
    } as unknown as jest.Mocked<AttachmentsService>;
    filesService = {
      validateEvidenceFile: jest.fn(),
      registerFile: jest.fn().mockResolvedValue(mockFileRecord),
    } as unknown as jest.Mocked<FilesService>;
    repo = {
      findRunItemById: jest.fn().mockResolvedValue(mockItem),
    } as unknown as jest.Mocked<ChecklistRunsRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistRunsService,
        { provide: ChecklistRunsRepository, useValue: repo },
        { provide: AuditLogsService, useValue: { recordWrite: jest.fn() } },
        { provide: AlertEventsService, useValue: {} },
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: {} },
        { provide: AttachmentsService, useValue: attachmentsService },
        { provide: FilesService, useValue: filesService },
        { provide: STORAGE_SERVICE, useValue: storage },
        { provide: TemperatureReadingsService, useValue: {} },
      ],
    }).compile();

    service = module.get(ChecklistRunsService);
  });

  it('creates file and attachment when run is IN_PROGRESS', async () => {
    const result = await service.uploadEvidence(
      { organizationId: mockOrgId, userId: 'user-1' },
      mockItemId,
      mockFile,
    );

    expect(filesService.validateEvidenceFile).toHaveBeenCalledWith('image/jpeg', 1024);
    expect(storage.saveBytes).toHaveBeenCalled();
    expect(filesService.registerFile).toHaveBeenCalled();
    expect(attachmentsService.create).toHaveBeenCalledWith(
      { organizationId: mockOrgId, userId: 'user-1' },
      expect.objectContaining({
        attachmentType: 'EVIDENCE',
        checklistRunResponseId: mockItemId,
      }),
    );
    expect(result).toEqual(mockAttachment);
  });

  it('rejects when item not found', async () => {
    repo.findRunItemById.mockResolvedValue(null as never);

    await expect(
      service.uploadEvidence(
        { organizationId: mockOrgId },
        mockItemId,
        mockFile,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects when run is COMPLETED', async () => {
    repo.findRunItemById.mockResolvedValue({
      ...mockItem,
      checklistRun: { ...mockRun, status: 'COMPLETED' as const },
    } as never);

    await expect(
      service.uploadEvidence(
        { organizationId: mockOrgId },
        mockItemId,
        mockFile,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when storage has no saveBytes', async () => {
    (storage as { saveBytes?: jest.Mock }).saveBytes = undefined;

    await expect(
      service.uploadEvidence(
        { organizationId: mockOrgId },
        mockItemId,
        mockFile,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
