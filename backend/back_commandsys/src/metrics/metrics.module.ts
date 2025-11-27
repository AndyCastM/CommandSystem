import { Module } from '@nestjs/common';
import { MetricsService } from './services/metrics.service';
import { MetricsController } from './controllers/metrics.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { MetricsExportService } from './services/metrics-export.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, PrismaService, MetricsExportService],
})
export class MetricsModule {}
