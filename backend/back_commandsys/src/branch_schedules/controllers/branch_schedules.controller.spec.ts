import { Test, TestingModule } from '@nestjs/testing';
import { BranchSchedulesController } from './branch_schedules.controller';
import { BranchSchedulesService } from '../services/branch_schedules.service';

describe('BranchSchedulesController', () => {
  let controller: BranchSchedulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BranchSchedulesController],
      providers: [BranchSchedulesService],
    }).compile();

    controller = module.get<BranchSchedulesController>(BranchSchedulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
