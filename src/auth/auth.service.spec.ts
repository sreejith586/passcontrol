import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../infra/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuditLogsService } from '../audit/services/audit-logs.service';
import { PasswordSetupTokenRepository } from './repositories/password-setup-token.repository';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let audit: jest.Mocked<AuditLogsService>;
  let passwordSetupTokenRepo: jest.Mocked<PasswordSetupTokenRepository>;

  const validToken = 'a'.repeat(64);
  const tokenHash = 'hash-of-token';

  const mockUserUpdate = jest.fn();

  beforeEach(async () => {
    mockUserUpdate.mockReset();
    const mockPrisma = {
      user: {
        update: mockUserUpdate,
      },
    };
    const mockJwt = {};
    const mockAudit = {
      recordAuthEvent: jest.fn().mockResolvedValue(undefined),
    };
    const mockPasswordSetupTokenRepo = {
      hashToken: jest.fn().mockReturnValue(tokenHash),
      findByTokenHash: jest.fn(),
      markUsed: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: AuditLogsService, useValue: mockAudit },
        { provide: PasswordSetupTokenRepository, useValue: mockPasswordSetupTokenRepo },
      ],
    }).compile();

    service = module.get(AuthService);
    prisma = module.get(PrismaService);
    audit = module.get(AuditLogsService);
    passwordSetupTokenRepo = module.get(PasswordSetupTokenRepository);
  });

  describe('validateSetupToken', () => {
    it('returns valid: true when token is valid and not used', async () => {
      passwordSetupTokenRepo.findByTokenHash.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash,
        expiresAt: new Date(Date.now() + 86400000),
        usedAt: null,
        createdAt: new Date(),
        user: { id: 'user-1', isActive: true },
      } as any);

      const result = await service.validateSetupToken(validToken);

      expect(result).toEqual({ valid: true });
    });

    it('returns valid: false, reason invalid when token not found', async () => {
      passwordSetupTokenRepo.findByTokenHash.mockResolvedValue(null);

      const result = await service.validateSetupToken(validToken);

      expect(result).toEqual({ valid: false, reason: 'invalid' });
    });

    it('returns valid: false, reason used when token already used', async () => {
      passwordSetupTokenRepo.findByTokenHash.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash,
        expiresAt: new Date(Date.now() + 86400000),
        usedAt: new Date(),
        createdAt: new Date(),
        user: { id: 'user-1', isActive: true },
      } as any);

      const result = await service.validateSetupToken(validToken);

      expect(result).toEqual({ valid: false, reason: 'used' });
    });

    it('returns valid: false, reason expired when token expired', async () => {
      passwordSetupTokenRepo.findByTokenHash.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash,
        expiresAt: new Date(Date.now() - 86400000),
        usedAt: null,
        createdAt: new Date(),
        user: { id: 'user-1', isActive: true },
      } as any);

      const result = await service.validateSetupToken(validToken);

      expect(result).toEqual({ valid: false, reason: 'expired' });
    });

    it('returns valid: false, reason invalid when user is inactive', async () => {
      passwordSetupTokenRepo.findByTokenHash.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash,
        expiresAt: new Date(Date.now() + 86400000),
        usedAt: null,
        createdAt: new Date(),
        user: { id: 'user-1', isActive: false },
      } as any);

      const result = await service.validateSetupToken(validToken);

      expect(result).toEqual({ valid: false, reason: 'invalid' });
    });
  });

  describe('setPassword', () => {
    const validRecord = {
      id: 'token-1',
      userId: 'user-1',
      tokenHash,
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      createdAt: new Date(),
      user: { id: 'user-1', isActive: true },
    };

    beforeEach(() => {
      passwordSetupTokenRepo.findByTokenHash.mockResolvedValue(validRecord as any);
      mockUserUpdate.mockResolvedValue({} as any);
    });

    it('succeeds once: hashes password, updates user, marks token used', async () => {
      const result = await service.setPassword(validToken, 'newpassword123');

      expect(result).toEqual({ passwordSet: true });
      const updateCall = mockUserUpdate.mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: 'user-1' });
      expect(updateCall.data.passwordHash).toBeDefined();
      expect(typeof updateCall.data.passwordHash).toBe('string');
      expect(
        await bcrypt.compare('newpassword123', updateCall.data.passwordHash),
      ).toBe(true);
      expect(passwordSetupTokenRepo.markUsed).toHaveBeenCalledWith('token-1');
      expect(audit.recordAuthEvent).toHaveBeenCalledWith('PASSWORD_SETUP_SUCCESS', {
        userId: 'user-1',
      });
    });

    it('used token cannot be reused', async () => {
      passwordSetupTokenRepo.findByTokenHash.mockResolvedValue({
        ...validRecord,
        usedAt: new Date(),
      } as any);

      await expect(
        service.setPassword(validToken, 'newpassword123'),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserUpdate).not.toHaveBeenCalled();
      expect(passwordSetupTokenRepo.markUsed).not.toHaveBeenCalled();
      expect(audit.recordAuthEvent).toHaveBeenCalledWith('PASSWORD_SETUP_FAILED', {
        reason: 'used',
      });
    });

    it('inactive user cannot set password', async () => {
      passwordSetupTokenRepo.findByTokenHash.mockResolvedValue({
        ...validRecord,
        user: { id: 'user-1', isActive: false } as any,
      } as any);

      await expect(
        service.setPassword(validToken, 'newpassword123'),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserUpdate).not.toHaveBeenCalled();
      expect(audit.recordAuthEvent).toHaveBeenCalledWith('PASSWORD_SETUP_FAILED', {
        reason: 'inactive_user',
        userId: 'user-1',
      });
    });

    it('throws when passwordConfirm does not match', async () => {
      await expect(
        service.setPassword(validToken, 'newpassword123', 'different'),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserUpdate).not.toHaveBeenCalled();
      expect(audit.recordAuthEvent).toHaveBeenCalledWith('PASSWORD_SETUP_FAILED', {
        reason: 'password_mismatch',
      });
    });

    it('invalid token throws', async () => {
      passwordSetupTokenRepo.findByTokenHash.mockResolvedValue(null);

      await expect(
        service.setPassword('invalid-token', 'newpassword123'),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserUpdate).not.toHaveBeenCalled();
      expect(audit.recordAuthEvent).toHaveBeenCalledWith('PASSWORD_SETUP_FAILED', {
        reason: 'invalid',
      });
    });
  });
});
