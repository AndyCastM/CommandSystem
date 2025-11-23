import { Module } from '@nestjs/common';
import { MetricsService } from './services/metrics.service';
import { MetricsController } from './controllers/metrics.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, PrismaService],
})
export class MetricsModule {}
