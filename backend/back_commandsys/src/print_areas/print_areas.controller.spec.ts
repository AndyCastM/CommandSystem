import { Test, TestingModule } from '@nestjs/testing';
import { PrintAreasController } from './print_areas.controller';
import { PrintAreasService } from './print_areas.service';

describe('PrintAreasController', () => {
  let controller: PrintAreasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrintAreasController],
      providers: [PrintAreasService],
    }).compile();

    controller = module.get<PrintAreasController>(PrintAreasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
