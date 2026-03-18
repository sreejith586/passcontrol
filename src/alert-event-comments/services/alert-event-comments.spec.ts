import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AlertEventCommentsService } from './alert-event-comments.service';
import { AlertEventCommentsRepository } from '../repositories/alert-event-comments.repository';
import { AlertEventsRepository } from '../../alert-events/repositories/alert-events.repository';

describe('AlertEventCommentsService', () => {
  let service: AlertEventCommentsService;
  let commentsRepo: jest.Mocked<AlertEventCommentsRepository>;
  let alertEventsRepo: jest.Mocked<AlertEventsRepository>;

  const mockOrgId = 'org-123';
  const mockAlertId = 'alert-1';
  const mockUserId = 'user-1';

  const mockAlert = {
    id: mockAlertId,
    organizationId: mockOrgId,
    status: 'OPEN',
  };

  beforeEach(async () => {
    const mockCommentsRepo = {
      create: jest.fn(),
      findByAlertId: jest.fn().mockResolvedValue([]),
    };
    const mockAlertEventsRepo = {
      findById: jest.fn().mockResolvedValue(mockAlert),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEventCommentsService,
        { provide: AlertEventCommentsRepository, useValue: mockCommentsRepo },
        { provide: AlertEventsRepository, useValue: mockAlertEventsRepo },
      ],
    }).compile();

    service = module.get(AlertEventCommentsService);
    commentsRepo = module.get(AlertEventCommentsRepository);
    alertEventsRepo = module.get(AlertEventsRepository);
  });

  describe('addComment', () => {
    it('adds COMMENT type', async () => {
      const dto = { type: 'COMMENT' as const, body: 'A comment' };
      const created = {
        id: 'comment-1',
        authorUserId: mockUserId,
        type: 'COMMENT',
        body: 'A comment',
        createdAt: new Date('2025-03-18T10:00:00Z'),
      };
      commentsRepo.create.mockResolvedValue(created as never);

      const result = await service.addComment(mockOrgId, mockAlertId, mockUserId, dto);

      expect(result).toMatchObject({
        id: 'comment-1',
        type: 'COMMENT',
        body: 'A comment',
        createdAt: '2025-03-18T10:00:00.000Z',
      });
      expect(alertEventsRepo.findById).toHaveBeenCalledWith(mockOrgId, mockAlertId);
      expect(commentsRepo.create).toHaveBeenCalledWith({
        organizationId: mockOrgId,
        alertEventId: mockAlertId,
        authorUserId: mockUserId,
        type: 'COMMENT',
        body: 'A comment',
      });
    });

    it('adds RESOLUTION_NOTE type', async () => {
      const dto = { type: 'RESOLUTION_NOTE' as const, body: 'Fixed the issue' };
      const created = {
        id: 'comment-2',
        authorUserId: mockUserId,
        type: 'RESOLUTION_NOTE',
        body: 'Fixed the issue',
        createdAt: new Date('2025-03-18T11:00:00Z'),
      };
      commentsRepo.create.mockResolvedValue(created as never);

      const result = await service.addComment(mockOrgId, mockAlertId, mockUserId, dto);

      expect(result.type).toBe('RESOLUTION_NOTE');
      expect(result.body).toBe('Fixed the issue');
    });

    it('rejects blank/whitespace-only body', async () => {
      const dto = { type: 'COMMENT' as const, body: '   ' };

      await expect(
        service.addComment(mockOrgId, mockAlertId, mockUserId, dto),
      ).rejects.toThrow(BadRequestException);

      expect(commentsRepo.create).not.toHaveBeenCalled();
    });

    it('rejects empty body', async () => {
      const dto = { type: 'COMMENT' as const, body: '' };

      await expect(
        service.addComment(mockOrgId, mockAlertId, mockUserId, dto),
      ).rejects.toThrow(BadRequestException);

      expect(commentsRepo.create).not.toHaveBeenCalled();
    });

    it('rejects body exceeding max length', async () => {
      const dto = { type: 'COMMENT' as const, body: 'x'.repeat(4001) };

      await expect(
        service.addComment(mockOrgId, mockAlertId, mockUserId, dto),
      ).rejects.toThrow(BadRequestException);

      expect(commentsRepo.create).not.toHaveBeenCalled();
    });

    it('cannot add comment to alert outside tenant', async () => {
      alertEventsRepo.findById.mockResolvedValue(null);

      await expect(
        service.addComment('org-other', mockAlertId, mockUserId, {
          type: 'COMMENT',
          body: 'A comment',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(commentsRepo.create).not.toHaveBeenCalled();
    });

    it('allows comments on RESOLVED alerts', async () => {
      alertEventsRepo.findById.mockResolvedValue({ ...mockAlert, status: 'RESOLVED' } as never);
      const created = {
        id: 'comment-3',
        authorUserId: mockUserId,
        type: 'COMMENT',
        body: 'Follow-up comment',
        createdAt: new Date(),
      };
      commentsRepo.create.mockResolvedValue(created as never);

      const result = await service.addComment(mockOrgId, mockAlertId, mockUserId, {
        type: 'COMMENT',
        body: 'Follow-up comment',
      });

      expect(result).toBeDefined();
      expect(commentsRepo.create).toHaveBeenCalled();
    });

    it('trims body before validation', async () => {
      const dto = { type: 'COMMENT' as const, body: '  trimmed  ' };
      const created = {
        id: 'comment-4',
        authorUserId: mockUserId,
        type: 'COMMENT',
        body: 'trimmed',
        createdAt: new Date(),
      };
      commentsRepo.create.mockResolvedValue(created as never);

      await service.addComment(mockOrgId, mockAlertId, mockUserId, dto);

      expect(commentsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'trimmed' }),
      );
    });
  });

  describe('listForAlert', () => {
    it('returns comments oldest-first', async () => {
      const mockComments = [
        {
          id: 'c1',
          authorUserId: 'u1',
          type: 'COMMENT',
          body: 'First',
          createdAt: new Date('2025-03-18T10:00:00Z'),
        },
        {
          id: 'c2',
          authorUserId: 'u2',
          type: 'RESOLUTION_NOTE',
          body: 'Second',
          createdAt: new Date('2025-03-18T11:00:00Z'),
        },
      ];
      commentsRepo.findByAlertId.mockResolvedValue(mockComments as never);

      const result = await service.listForAlert(mockOrgId, mockAlertId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('c1');
      expect(result[0].createdAt).toBe('2025-03-18T10:00:00.000Z');
      expect(result[1].id).toBe('c2');
      expect(result[1].createdAt).toBe('2025-03-18T11:00:00.000Z');
      expect(commentsRepo.findByAlertId).toHaveBeenCalledWith(mockOrgId, mockAlertId);
    });

    it('enforces organization isolation', async () => {
      alertEventsRepo.findById.mockResolvedValue(null);

      await expect(service.listForAlert('org-other', mockAlertId)).rejects.toThrow(
        NotFoundException,
      );

      expect(commentsRepo.findByAlertId).not.toHaveBeenCalled();
    });

    it('returns empty array when no comments', async () => {
      commentsRepo.findByAlertId.mockResolvedValue([]);

      const result = await service.listForAlert(mockOrgId, mockAlertId);

      expect(result).toEqual([]);
    });
  });
});
