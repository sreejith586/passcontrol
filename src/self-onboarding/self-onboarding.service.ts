import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  OrganizationTenantStatus,
  OrganizationTenantType,
  Prisma,
} from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../infra/prisma/prisma.service';
import { MailService } from '../notifications/mail/mail.service';
import { EmailVerificationTokenRepository } from './repositories/email-verification-token.repository';
import type { SelfOnboardingSignupDto } from './dto/self-onboarding-signup.dto';
import type { SelfOnboardingVerifyEmailDto } from './dto/self-onboarding-verify-email.dto';
import { bootstrapDefaultOrganizationRoles } from '../organization/bootstrap/bootstrap-default-organization-roles';

export interface SelfOnboardingSignupResult {
  message: string;
  organizationId: string;
  requiresEmailVerification: true;
}

export interface SelfOnboardingVerifyEmailResult {
  message: string;
}

@Injectable()
export class SelfOnboardingService {
  private readonly logger = new Logger(SelfOnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly mail: MailService,
    private readonly emailVerificationTokens: EmailVerificationTokenRepository,
  ) {}

  /**
   * Completes email verification: sets `emailVerifiedAt` when needed, always consumes a valid unused token.
   * If the user was already verified, the token is still marked used (invalidates the link) and returns success.
   */
  async verifyEmail(
    dto: SelfOnboardingVerifyEmailDto,
  ): Promise<SelfOnboardingVerifyEmailResult> {
    const tokenHash = this.emailVerificationTokens.hashToken(dto.token);

    const message = await this.prisma.$transaction(async (tx) => {
      const record = await tx.emailVerificationToken.findFirst({
        where: { tokenHash },
        include: { user: true },
      });

      if (!record) {
        throw new BadRequestException('This verification link is invalid.');
      }

      if (record.usedAt) {
        throw new BadRequestException(
          'This verification link has already been used.',
        );
      }

      const now = new Date();
      if (record.expiresAt < now) {
        throw new BadRequestException('This verification link has expired.');
      }

      if (!record.user.isActive || record.user.deletedAt) {
        throw new BadRequestException('This verification link is invalid.');
      }

      if (record.user.emailVerifiedAt) {
        await tx.emailVerificationToken.update({
          where: { id: record.id },
          data: { usedAt: now },
        });
        return 'Your email is already verified.';
      }

      await tx.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: now },
      });
      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      });
      return 'Your email has been verified.';
    });

    return { message };
  }

  async signup(dto: SelfOnboardingSignupDto): Promise<SelfOnboardingSignupResult> {
    const email = dto.email;
    const existing = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.auth.hashPassword(dto.password);
    const tenant = this.buildTenantPolicyFields(dto.signupMode);
    const phoneNumber =
      dto.phoneNumber && dto.phoneNumber.length > 0 ? dto.phoneNumber : null;
    const jobTitle =
      dto.jobTitle && dto.jobTitle.length > 0 ? dto.jobTitle : null;
    const signupSource =
      dto.signupSource && dto.signupSource.length > 0 ? dto.signupSource : null;

    let organizationId: string;
    let plainVerificationToken: string;
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: dto.organizationName,
            ...tenant,
            signupSource,
          },
        });

        const { orgAdminRoleId } = await bootstrapDefaultOrganizationRoles(
          tx,
          organization.id,
        );

        const user = await tx.user.create({
          data: {
            email,
            name: dto.fullName,
            passwordHash,
            phoneNumber,
            jobTitle,
            isActive: true,
          },
        });

        await tx.userRoleAssignment.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            roleId: orgAdminRoleId,
          },
        });

        const token =
          await this.emailVerificationTokens.createInTransaction(tx, user.id);

        return {
          organizationId: organization.id,
          plainVerificationToken: token,
        };
      });
      organizationId = result.organizationId;
      plainVerificationToken = result.plainVerificationToken;
    } catch (e) {
      if (this.isUniqueEmailConstraintViolation(e)) {
        throw new ConflictException('An account with this email already exists');
      }
      throw e;
    }

    const baseUrl = (process.env.APP_BASE_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(plainVerificationToken)}`;

    const subject = '[PassControl] Verify your email';
    const body = [
      `Thanks for signing up for PassControl.`,
      '',
      'Please verify your email address to finish setting up your organization:',
      verifyUrl,
      '',
      'This link expires in 7 days.',
      '',
      '— PassControl',
    ].join('\n');

    try {
      // Platform/system mail only: do not pass organizationId (avoids tenant SMTP selection).
      await this.mail.send(email, subject, body);
    } catch (err) {
      this.logger.warn(
        `Self-onboarding: failed to send verification email to ${email}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return {
      message:
        'Your organization has been created. Check your email to verify your address.',
      organizationId,
      requiresEmailVerification: true,
    };
  }

  private buildTenantPolicyFields(signupMode: OrganizationTenantType): {
    tenantType: OrganizationTenantType;
    tenantStatus: OrganizationTenantStatus;
    isSelfOnboarded: boolean;
    trialEndsAt: Date;
    maxUsers: number;
    maxLocations: number;
    maxTemplates: number;
    maxSchedules: number;
  } {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    if (signupMode === OrganizationTenantType.DEMO) {
      return {
        tenantType: OrganizationTenantType.DEMO,
        tenantStatus: OrganizationTenantStatus.TRIAL,
        isSelfOnboarded: true,
        trialEndsAt,
        maxUsers: 3,
        maxLocations: 1,
        maxTemplates: 3,
        maxSchedules: 3,
      };
    }

    return {
      tenantType: OrganizationTenantType.STANDARD,
      tenantStatus: OrganizationTenantStatus.TRIAL,
      isSelfOnboarded: true,
      trialEndsAt,
      maxUsers: 10,
      maxLocations: 3,
      maxTemplates: 10,
      maxSchedules: 10,
    };
  }

  /** Race: two signups with same email — DB unique on users.email surfaces as P2002. */
  private isUniqueEmailConstraintViolation(e: unknown): boolean {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== 'P2002') {
      return false;
    }
    const raw = e.meta?.target;
    const targets = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
    return targets.some(
      (t) =>
        t === 'email' ||
        t === 'users_email_key' ||
        String(t).toLowerCase().includes('email'),
    );
  }
}
