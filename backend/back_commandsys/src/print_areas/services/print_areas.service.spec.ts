import { Test, TestingModule } from '@nestjs/testing';
import { PrintAreasService } from './print_areas.service';

describe('PrintAreasService', () => {
  let service: PrintAreasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrintAreasService],
    }).compile();

    service = module.get<PrintAreasService>(PrintAreasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
