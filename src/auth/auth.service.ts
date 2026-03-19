import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../infra/prisma/prisma.service';
import { AuditLogsService } from '../audit/services/audit-logs.service';
import { PasswordSetupTokenRepository } from './repositories/password-setup-token.repository';
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

export type ValidateSetupTokenResult =
  | { valid: true }
  | { valid: false; reason: 'invalid' | 'expired' | 'used' };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditLogsService,
    private readonly passwordSetupTokenRepo: PasswordSetupTokenRepository,
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

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, orgId: assignment.organizationId, email: user.email } as JwtPayload,
      {
        secret: this.getAccessSecret(),
        expiresIn: this.getAccessExpiresIn(),
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, orgId: assignment.organizationId, type: 'refresh' } as JwtPayload,
      {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshExpiresIn(),
      },
    );

    await this.audit.recordAuthEvent('LOGIN_SUCCESS', {
      userId: user.id,
      organizationId: assignment.organizationId,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: { id: user.id, email: user.email, name: user.name },
    };
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
