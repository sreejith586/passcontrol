import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../infra/prisma/prisma.service';
import { AuditLogsService } from '../audit/services/audit-logs.service';
import { PasswordSetupTokenRepository } from './repositories/password-setup-token.repository';
import { PasswordResetTokenRepository } from './repositories/password-reset-token.repository';
import { LoginDto } from './dto/login.dto';

interface JwtPayload {
  sub: string;
  orgId: string;
  email?: string;
  type?: string;
}

// Dev-only fallbacks to keep local bootstrapping working until env vars are set.
const DEV_ONLY_ACCESS_SECRET = 'dev-access-secret-change-me';
const DEV_ONLY_REFRESH_SECRET = 'dev-refresh-secret-change-me';

/** Seeded org name for instant demo user; avoids issuing tokens for the wrong tenant if mis-assigned. */
const DEMO_ORG_NAME = 'Demo Org';

const DEFAULT_DEMO_INSTANT_USER_EMAIL = 'demo-explorer@demo.passcontrol.local';

export type ValidateSetupTokenResult =
  | { valid: true }
  | { valid: false; reason: 'invalid' | 'expired' | 'used' };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditLogsService,
    private readonly passwordSetupTokenRepo: PasswordSetupTokenRepository,
    private readonly passwordResetTokenRepo: PasswordResetTokenRepository,
  ) {}

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  private getAccessSecret() {
    return process.env.JWT_ACCESS_SECRET || DEV_ONLY_ACCESS_SECRET;
  }

  private getRefreshSecret() {
    return process.env.JWT_REFRESH_SECRET || DEV_ONLY_REFRESH_SECRET;
  }

  private getAccessExpiresIn() {
    return process.env.JWT_ACCESS_EXPIRES_IN || '15m';
  }

  private getRefreshExpiresIn() {
    return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
    });
    if (!user?.passwordHash) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  private async buildAuthResponse(
    user: { id: string; email: string | null; name: string | null },
    organizationId: string,
  ) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, orgId: organizationId, email: user.email } as JwtPayload,
      {
        secret: this.getAccessSecret(),
        expiresIn: this.getAccessExpiresIn(),
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, orgId: organizationId, type: 'refresh' } as JwtPayload,
      {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshExpiresIn(),
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      await this.audit.recordAuthEvent('LOGIN_FAILED', { email: dto.email });
      throw new UnauthorizedException('Invalid credentials');
    }

    const assignment = await this.prisma.userRoleAssignment.findFirst({
      where: { userId: user.id },
    });
    if (!assignment) {
      await this.audit.recordAuthEvent('LOGIN_NO_ORG', { userId: user.id });
      throw new UnauthorizedException('No organization assigned');
    }

    const out = await this.buildAuthResponse(user, assignment.organizationId);

    await this.audit.recordAuthEvent('LOGIN_SUCCESS', {
      userId: user.id,
      organizationId: assignment.organizationId,
    });

    return out;
  }

  /**
   * Dedicated instant-demo session. Gated by DEMO_INSTANT_ACCESS_ENABLED; optional shared secret via DEMO_INSTANT_ACCESS_KEY.
   * Does not change email/password login behavior.
   */
  async issueInstantDemoSession(clientDemoKey?: string | null) {
    const stripWrappingQuotes = (v: string) =>
      v.replace(/^["']|["']$/g, '').trim();

    const enabledRaw = (process.env.DEMO_INSTANT_ACCESS_ENABLED ?? '').trim();
    const enabled = stripWrappingQuotes(enabledRaw);
    if (enabled !== 'true') {
      throw new ForbiddenException('Instant demo access is disabled');
    }

    const keyRaw = process.env.DEMO_INSTANT_ACCESS_KEY;
    const expectedKey =
      keyRaw != null && String(keyRaw).trim() !== ''
        ? stripWrappingQuotes(String(keyRaw).trim())
        : '';
    if (expectedKey !== '') {
      const clientKey = stripWrappingQuotes(String(clientDemoKey ?? '').trim());
      if (clientKey !== expectedKey) {
        throw new ForbiddenException('Instant demo access is not available');
      }
    }

    const email = (
      process.env.DEMO_INSTANT_USER_EMAIL ?? DEFAULT_DEMO_INSTANT_USER_EMAIL
    )
      .toLowerCase()
      .trim();

    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true, deletedAt: null },
    });
    if (!user) {
      this.logger.warn(`DEMO_INSTANT: no active user for ${email}`);
      throw new ForbiddenException('Demo workspace is not available');
    }

    const assignment = await this.prisma.userRoleAssignment.findFirst({
      where: { userId: user.id },
    });
    if (!assignment) {
      throw new ForbiddenException('Demo workspace is not available');
    }

    const org = await this.prisma.organization.findFirst({
      where: { id: assignment.organizationId, deletedAt: null },
    });
    if (!org || org.name !== DEMO_ORG_NAME) {
      this.logger.warn(
        `DEMO_INSTANT: user ${email} org ${assignment.organizationId} is not ${DEMO_ORG_NAME}`,
      );
      throw new ForbiddenException('Demo workspace is not available');
    }

    const out = await this.buildAuthResponse(user, assignment.organizationId);
    await this.audit.recordAuthEvent('DEMO_INSTANT_ACCESS', {
      userId: user.id,
      organizationId: assignment.organizationId,
    });
    return out;
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.getRefreshSecret(),
      });
      if (payload.type !== 'refresh') throw new Error('Invalid token type');

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user?.isActive) throw new Error('User inactive');

      const accessToken = await this.jwt.signAsync(
        { sub: user.id, orgId: payload.orgId, email: user.email } as JwtPayload,
        {
          secret: this.getAccessSecret(),
          expiresIn: this.getAccessExpiresIn(),
        },
      );

      const newRefreshToken = await this.jwt.signAsync(
        { sub: user.id, orgId: payload.orgId, type: 'refresh' } as JwtPayload,
        {
          secret: this.getRefreshSecret(),
          expiresIn: this.getRefreshExpiresIn(),
        },
      );

      await this.audit.recordAuthEvent('TOKEN_REFRESH', {
        userId: user.id,
        organizationId: payload.orgId,
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
      };
    } catch {
      await this.audit.recordAuthEvent('TOKEN_REFRESH_FAILED', {});
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateSetupToken(token: string): Promise<ValidateSetupTokenResult> {
    const tokenHash = this.passwordSetupTokenRepo.hashToken(token);
    const record = await this.passwordSetupTokenRepo.findByTokenHash(tokenHash);

    if (!record) {
      return { valid: false, reason: 'invalid' };
    }
    if (record.usedAt) {
      return { valid: false, reason: 'used' };
    }
    if (record.expiresAt < new Date()) {
      return { valid: false, reason: 'expired' };
    }
    if (!record.user.isActive) {
      return { valid: false, reason: 'invalid' };
    }

    return { valid: true };
  }

  async setPassword(
    token: string,
    password: string,
    passwordConfirm?: string,
  ): Promise<{ passwordSet: true }> {
    if (
      passwordConfirm !== undefined &&
      passwordConfirm !== null &&
      passwordConfirm !== password
    ) {
      await this.audit.recordAuthEvent('PASSWORD_SETUP_FAILED', {
        reason: 'password_mismatch',
      });
      throw new BadRequestException('Passwords do not match');
    }

    const tokenHash = this.passwordSetupTokenRepo.hashToken(token);
    const record = await this.passwordSetupTokenRepo.findByTokenHash(tokenHash);

    if (!record) {
      await this.audit.recordAuthEvent('PASSWORD_SETUP_FAILED', {
        reason: 'invalid',
      });
      throw new BadRequestException('Invalid or expired setup link');
    }
    if (record.usedAt) {
      await this.audit.recordAuthEvent('PASSWORD_SETUP_FAILED', {
        reason: 'used',
      });
      throw new BadRequestException('Setup link has already been used');
    }
    if (record.expiresAt < new Date()) {
      await this.audit.recordAuthEvent('PASSWORD_SETUP_FAILED', {
        reason: 'expired',
      });
      throw new BadRequestException('Setup link has expired');
    }
    if (!record.user.isActive) {
      await this.audit.recordAuthEvent('PASSWORD_SETUP_FAILED', {
        reason: 'inactive_user',
        userId: record.userId,
      });
      throw new BadRequestException('Account is inactive');
    }

    const passwordHash = await this.hashPassword(password);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await this.passwordSetupTokenRepo.markUsed(record.id);

    await this.audit.recordAuthEvent('PASSWORD_SETUP_SUCCESS', {
      userId: record.userId,
    });

    return { passwordSet: true };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), isActive: true, deletedAt: null },
    });
    if (!user) {
      return;
    }
    const plainToken = await this.passwordResetTokenRepo.create(user.id);
    const resetUrl = `${process.env.APP_BASE_URL ?? 'http://localhost:3000'}/reset-password?token=${plainToken}`;
    this.logger.log(`[FORGOT_PASSWORD] Would send email to ${user.email} with reset link: ${resetUrl}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: true }> {
    const tokenHash = this.passwordResetTokenRepo.hashToken(token);
    const record = await this.passwordResetTokenRepo.findByTokenHash(tokenHash);

    if (!record) {
      throw new BadRequestException('Invalid or expired reset link');
    }
    if (record.usedAt) {
      throw new BadRequestException('Reset link has already been used');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Reset link has expired');
    }
    if (!record.user.isActive) {
      throw new BadRequestException('Account is inactive');
    }

    const passwordHash = await this.hashPassword(newPassword);
    const now = new Date();
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, passwordUpdatedAt: now },
    });
    await this.passwordResetTokenRepo.markUsed(record.id);
    await this.passwordResetTokenRepo.invalidateUnusedByUserId(record.userId);

    await this.audit.recordAuthEvent('PASSWORD_RESET_SUCCESS', { userId: record.userId });

    return { success: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user?.passwordHash) {
      throw new BadRequestException('Cannot change password for account without password');
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      await this.audit.recordAuthEvent('PASSWORD_CHANGE_FAILED', {
        userId,
        reason: 'invalid_current',
      });
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await this.hashPassword(newPassword);
    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordUpdatedAt: now },
    });

    await this.audit.recordAuthEvent('PASSWORD_CHANGE_SUCCESS', { userId });

    return { success: true };
  }

  async me(userId: string, organizationId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException();

    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId, organizationId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    const roles = assignments.map((a) => a.role.key);
    const permissions = new Set<string>();
    assignments.forEach((a) =>
      a.role.permissions.forEach((rp) => permissions.add(rp.permission.key)),
    );

    return {
      user: { id: user.id, email: user.email, name: user.name },
      organizationId,
      roles,
      permissions: Array.from(permissions),
    };
  }
}
