import { Global, Module } from '@nestjs/common';
import { OrganizationSettingsModule } from '../../organization-settings/organization-settings.module';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [OrganizationSettingsModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
