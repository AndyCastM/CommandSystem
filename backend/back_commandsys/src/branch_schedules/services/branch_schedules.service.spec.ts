import { Test, TestingModule } from '@nestjs/testing';
import { BranchSchedulesService } from './branch_schedules.service';

describe('BranchSchedulesService', () => {
  let service: BranchSchedulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BranchSchedulesService],
    }).compile();

    service = module.get<BranchSchedulesService>(BranchSchedulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
