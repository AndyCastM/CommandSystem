import { Module } from '@nestjs/common';
import { CompaniesService } from './services/companies.service';
import { CompaniesController } from './controllers/companies.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrintAreasModule } from 'src/print_areas/print_areas.module';

@Module({
  imports: [PrintAreasModule],
  controllers: [CompaniesController],
  providers: [CompaniesService, PrismaService],
})
export class CompaniesModule {}
