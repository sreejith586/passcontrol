import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { AccessModule } from '../access/access.module';
import { RolesModule } from '../roles/roles.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../notifications/mail/mail.module';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { UsersRepository } from './repositories/users.repository';

@Module({
  imports: [InfraModule, AccessModule, RolesModule, AuthModule, MailModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
