import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrganizationSettingsService } from './organization-settings.service';
import { OrganizationSettingsRepository } from '../repositories/organization-settings.repository';
import { AuditLogsService } from '../../audit/services/audit-logs.service';

describe('OrganizationSettingsService', () => {
  let service: OrganizationSettingsService;
  let repo: jest.Mocked<OrganizationSettingsRepository>;
  let audit: jest.Mocked<AuditLogsService>;

  const orgA = 'org-a';
  const orgB = 'org-b';
  const mockCtxA = { organizationId: orgA, userId: 'user-1' };
  const mockCtxB = { organizationId: orgB, userId: 'user-2' };

  beforeEach(async () => {
    const mockRepo = {
      getAlertWorkflowSettings: jest.fn(),
      updateAlertWorkflowSettings: jest.fn(),
    };
    const mockAudit = { recordWrite: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationSettingsService,
        { provide: OrganizationSettingsRepository, useValue: mockRepo },
        { provide: AuditLogsService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(OrganizationSettingsService);
    repo = module.get(OrganizationSettingsRepository);
    audit = module.get(AuditLogsService);
  });

  describe('getAlertWorkflow', () => {
    it('returns current setting for the caller organization', async () => {
      repo.getAlertWorkflowSettings.mockResolvedValue({
        requireResolutionNoteOnResolve: false,
      });

      const result = await service.getAlertWorkflow({ organizationId: orgA });

      expect(result).toEqual({ requireResolutionNoteOnResolve: false });
      expect(repo.getAlertWorkflowSettings).toHaveBeenCalledWith(orgA);
    });

    it('returns true when policy enabled', async () => {
      repo.getAlertWorkflowSettings.mockResolvedValue({
        requireResolutionNoteOnResolve: true,
      });

      const result = await service.getAlertWorkflow({ organizationId: orgA });

      expect(result).toEqual({ requireResolutionNoteOnResolve: true });
    });

    it('throws NotFoundException when organization not found', async () => {
      repo.getAlertWorkflowSettings.mockResolvedValue(null);

      await expect(
        service.getAlertWorkflow({ organizationId: orgA }),
      ).rejects.toThrow(NotFoundException);

      expect(repo.getAlertWorkflowSettings).toHaveBeenCalledWith(orgA);
    });

    it('tenant isolation: uses ctx.organizationId only', async () => {
      repo.getAlertWorkflowSettings.mockImplementation(async (orgId) => {
        if (orgId === orgA) return { requireResolutionNoteOnResolve: false };
        if (orgId === orgB) return { requireResolutionNoteOnResolve: true };
        return null;
      });

      const resultA = await service.getAlertWorkflow(mockCtxA);
      const resultB = await service.getAlertWorkflow(mockCtxB);

      expect(resultA).toEqual({ requireResolutionNoteOnResolve: false });
      expect(resultB).toEqual({ requireResolutionNoteOnResolve: true });
      expect(repo.getAlertWorkflowSettings).toHaveBeenCalledWith(orgA);
      expect(repo.getAlertWorkflowSettings).toHaveBeenCalledWith(orgB);
    });
  });

  describe('updateAlertWorkflow', () => {
    it('updates only the caller organization', async () => {
      repo.getAlertWorkflowSettings.mockResolvedValue({
        requireResolutionNoteOnResolve: false,
      });
      repo.updateAlertWorkflowSettings.mockResolvedValue({
        requireResolutionNoteOnResolve: true,
      });

      const result = await service.updateAlertWorkflow(mockCtxA, {
        requireResolutionNoteOnResolve: true,
      });

      expect(result).toEqual({ requireResolutionNoteOnResolve: true });
      expect(repo.updateAlertWorkflowSettings).toHaveBeenCalledWith(orgA, {
        requireResolutionNoteOnResolve: true,
      });
      expect(audit.recordWrite).toHaveBeenCalledWith(
        'ORGANIZATION_SETTINGS_ALERT_WORKFLOW_UPDATE',
        mockCtxA,
        orgA,
        expect.objectContaining({
          before: { requireResolutionNoteOnResolve: false },
          after: { requireResolutionNoteOnResolve: true },
        }),
      );
    });

    it('returns previous value when update affects 0 rows', async () => {
      repo.getAlertWorkflowSettings.mockResolvedValue({
        requireResolutionNoteOnResolve: false,
      });
      repo.updateAlertWorkflowSettings.mockResolvedValue(null);

      const result = await service.updateAlertWorkflow(mockCtxA, {
        requireResolutionNoteOnResolve: true,
      });

      expect(result).toEqual({ requireResolutionNoteOnResolve: false });
    });

    it('throws NotFoundException when organization not found', async () => {
      repo.getAlertWorkflowSettings.mockResolvedValue(null);

      await expect(
        service.updateAlertWorkflow(mockCtxA, {
          requireResolutionNoteOnResolve: true,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(repo.updateAlertWorkflowSettings).not.toHaveBeenCalled();
    });

    it('tenant isolation: update does not affect other orgs', async () => {
      repo.getAlertWorkflowSettings.mockResolvedValue({
        requireResolutionNoteOnResolve: false,
      });
      repo.updateAlertWorkflowSettings.mockResolvedValue({
        requireResolutionNoteOnResolve: true,
      });

      await service.updateAlertWorkflow(mockCtxA, {
        requireResolutionNoteOnResolve: true,
      });

      expect(repo.updateAlertWorkflowSettings).toHaveBeenCalledWith(orgA, {
        requireResolutionNoteOnResolve: true,
      });
      expect(repo.updateAlertWorkflowSettings).not.toHaveBeenCalledWith(
        orgB,
        expect.anything(),
      );
    });
  });
});
