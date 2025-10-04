import { Test, TestingModule } from '@nestjs/testing';
import { TableLocationsService } from './table_locations.service';

describe('TableLocationsService', () => {
  let service: TableLocationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TableLocationsService],
    }).compile();

    service = module.get<TableLocationsService>(TableLocationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
