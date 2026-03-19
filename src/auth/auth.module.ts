import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { InfraModule } from '../infra/infra.module';
import { AuditModule } from '../audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PasswordSetupTokenRepository } from './repositories/password-setup-token.repository';

// Dev-only fallback to keep local bootstrapping working until env vars are set.
const DEV_ONLY_ACCESS_SECRET = 'dev-access-secret-change-me';

@Module({
  imports: [
    InfraModule,
    AuditModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || DEV_ONLY_ACCESS_SECRET,
      signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PasswordSetupTokenRepository],
  exports: [AuthService, PasswordSetupTokenRepository],
})
export class AuthModule {}
