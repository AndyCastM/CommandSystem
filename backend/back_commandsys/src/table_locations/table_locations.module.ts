import { Module } from '@nestjs/common';
import { TableLocationsService } from './services/table_locations.service';
import { TableLocationsController } from './controllers/table_locations.controller';

@Module({
  controllers: [TableLocationsController],
  providers: [TableLocationsService],
})
export class TableLocationsModule {}
