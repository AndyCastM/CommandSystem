import { Module } from '@nestjs/common';
import { CompaniesService } from './services/companies.service';
import { CompaniesController } from './controllers/companies.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrintAreasService } from 'src/print_areas/services/print_areas.service';

@Module({
  imports: [PrintAreasService],
  controllers: [CompaniesController],
  providers: [CompaniesService, PrismaService],
})
export class CompaniesModule {}
