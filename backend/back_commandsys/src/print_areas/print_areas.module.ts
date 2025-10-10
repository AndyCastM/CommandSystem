import { Module } from '@nestjs/common';
import { PrintAreasService } from './services/print_areas.service';
import { PrintAreasController } from './controllers/print_areas.controller';

@Module({
  controllers: [PrintAreasController],
  providers: [PrintAreasService],
  exports: [PrintAreasService],
})
export class PrintAreasModule {}
