import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../notifications/mail/mail.module';
import { SelfOnboardingController } from './controllers/self-onboarding.controller';
import { SelfOnboardingService } from './self-onboarding.service';
import { EmailVerificationTokenRepository } from './repositories/email-verification-token.repository';

@Module({
  imports: [InfraModule, AuthModule, MailModule],
  controllers: [SelfOnboardingController],
  providers: [SelfOnboardingService, EmailVerificationTokenRepository],
})
export class SelfOnboardingModule {}
