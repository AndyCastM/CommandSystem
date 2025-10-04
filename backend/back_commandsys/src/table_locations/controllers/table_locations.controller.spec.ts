import { Test, TestingModule } from '@nestjs/testing';
import { TableLocationsController } from './table_locations.controller';
import { TableLocationsService } from '../services/table_locations.service';

describe('TableLocationsController', () => {
  let controller: TableLocationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TableLocationsController],
      providers: [TableLocationsService],
    }).compile();

    controller = module.get<TableLocationsController>(TableLocationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
