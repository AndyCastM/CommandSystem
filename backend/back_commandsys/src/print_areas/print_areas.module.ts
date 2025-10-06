import { Module } from '@nestjs/common';
import { PrintAreasService } from './print_areas.service';
import { PrintAreasController } from './print_areas.controller';

@Module({
  controllers: [PrintAreasController],
  providers: [PrintAreasService],
})
export class PrintAreasModule {}
