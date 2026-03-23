import { Global, Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './logging/logger.module';
import { CryptoModule } from './crypto/crypto.module';

@Global()
@Module({
  imports: [PrismaModule, ConfigModule, LoggerModule, CryptoModule],
  exports: [PrismaModule, ConfigModule, LoggerModule, CryptoModule],
})
export class InfraModule {}
