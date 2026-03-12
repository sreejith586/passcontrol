import { Global, Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './logging/logger.module';

@Global()
@Module({
  imports: [PrismaModule, ConfigModule, LoggerModule],
  exports: [PrismaModule, ConfigModule, LoggerModule],
})
export class InfraModule {}
