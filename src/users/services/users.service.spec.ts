import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from '../repositories/users.repository';
import { RolesService } from '../../roles/services/roles.service';
import { PasswordSetupTokenRepository } from '../../auth/repositories/password-setup-token.repository';
import { MailService } from '../../notifications/mail/mail.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<UsersRepository>;
  let rolesService: jest.Mocked<RolesService>;
  let passwordSetupTokenRepo: jest.Mocked<PasswordSetupTokenRepository>;

  const orgId = 'org-1';
  const roleId = 'role-1';
  const ctx = { organizationId: orgId };

  beforeEach(async () => {
    const mockRepo = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
      hasRoleInOrg: jest.fn(),
      assignRole: jest.fn(),
      getUserWithRoles: jest.fn(),
    };
    const mockRolesService = {
      isRoleAssignableInOrg: jest.fn().mockResolvedValue(true),
    };
    const mockPasswordSetupTokenRepo = {
      invalidateUnusedByUserId: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue('setup-token-abc123'),
    };
    const mockMail = { send: jest.fn().mockResolvedValue({}) };
    const mockPrisma = {
      organization: { findUnique: jest.fn().mockResolvedValue({ name: 'Test Org' }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepo },
        { provide: RolesService, useValue: mockRolesService },
        { provide: PasswordSetupTokenRepository, useValue: mockPasswordSetupTokenRepo },
        { provide: MailService, useValue: mockMail },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(UsersRepository);
    rolesService = module.get(RolesService);
    passwordSetupTokenRepo = module.get(PasswordSetupTokenRepository);
  });

  describe('invite', () => {
    it('returns setupToken when invited user has no passwordHash', async () => {
      const newUser = {
        id: 'user-1',
        email: 'new@example.com',
        name: 'new',
        passwordHash: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      repo.findUserByEmail.mockResolvedValue(null);
      repo.createUser.mockResolvedValue(newUser as any);
      repo.hasRoleInOrg.mockResolvedValue(false);
      repo.assignRole.mockResolvedValue({} as any);
      repo.getUserWithRoles.mockResolvedValue({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        isActive: true,
        roles: [{ id: roleId, name: 'Viewer', key: 'viewer' }],
      });

      const result = await service.invite(ctx, {
        email: 'new@example.com',
        roleId,
      });

      expect(result.setupToken).toBe('setup-token-abc123');
      expect(passwordSetupTokenRepo.invalidateUnusedByUserId).toHaveBeenCalledWith(
        newUser.id,
      );
      expect(passwordSetupTokenRepo.create).toHaveBeenCalledWith(newUser.id);
    });

    it('does not return setupToken when user already has password', async () => {
      const existingUser = {
        id: 'user-2',
        email: 'existing@example.com',
        name: 'existing',
        passwordHash: 'hashed',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      repo.findUserByEmail.mockResolvedValue(existingUser as any);
      repo.hasRoleInOrg.mockResolvedValue(false);
      repo.assignRole.mockResolvedValue({} as any);
      repo.getUserWithRoles.mockResolvedValue({
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        isActive: true,
        roles: [{ id: roleId, name: 'Viewer', key: 'viewer' }],
      });

      const result = await service.invite(ctx, {
        email: 'existing@example.com',
        roleId,
      });

      expect(result.setupToken).toBeUndefined();
      expect(passwordSetupTokenRepo.invalidateUnusedByUserId).not.toHaveBeenCalled();
      expect(passwordSetupTokenRepo.create).not.toHaveBeenCalled();
    });

    it('re-invite invalidates prior unused token and returns fresh setupToken', async () => {
      const userNoPassword = {
        id: 'user-3',
        email: 'reinvite@example.com',
        name: 'reinvite',
        passwordHash: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      repo.findUserByEmail.mockResolvedValue(userNoPassword as any);
      repo.hasRoleInOrg.mockResolvedValue(true);
      repo.getUserWithRoles.mockResolvedValue({
        id: userNoPassword.id,
        name: userNoPassword.name,
        email: userNoPassword.email,
        isActive: true,
        roles: [{ id: roleId, name: 'Viewer', key: 'viewer' }],
      });
      passwordSetupTokenRepo.create.mockResolvedValue('new-token-xyz');

      const result = await service.invite(ctx, {
        email: 'reinvite@example.com',
        roleId,
      });

      expect(result.setupToken).toBe('new-token-xyz');
      expect(passwordSetupTokenRepo.invalidateUnusedByUserId).toHaveBeenCalledWith(
        userNoPassword.id,
      );
      expect(passwordSetupTokenRepo.create).toHaveBeenCalledWith(
        userNoPassword.id,
      );
    });

    it('throws when role is not assignable in org', async () => {
      rolesService.isRoleAssignableInOrg.mockResolvedValue(false);

      await expect(
        service.invite(ctx, { email: 'x@example.com', roleId }),
      ).rejects.toThrow(BadRequestException);

      expect(repo.findUserByEmail).not.toHaveBeenCalled();
    });
  });
});
