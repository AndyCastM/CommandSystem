import { Module } from '@nestjs/common';
import { AlexaDevicesService } from './alexa-devices.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [AlexaDevicesService, PrismaService],
  exports: [AlexaDevicesService],
})
export class AlexaDevicesModule {}
