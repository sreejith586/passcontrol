import { Global, Module, OnModuleInit } from '@nestjs/common';
import { EncryptionService, validateEncryptionKeyConfig } from './encryption.service';

@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class CryptoModule implements OnModuleInit {
  onModuleInit() {
    validateEncryptionKeyConfig();
  }
}
