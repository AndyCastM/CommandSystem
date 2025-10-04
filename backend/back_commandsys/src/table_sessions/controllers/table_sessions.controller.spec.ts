import { Test, TestingModule } from '@nestjs/testing';
import { TableSessionsController } from './table_sessions.controller';
import { TableSessionsService } from '../services/table_sessions.service';

describe('TableSessionsController', () => {
  let controller: TableSessionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TableSessionsController],
      providers: [TableSessionsService],
    }).compile();

    controller = module.get<TableSessionsController>(TableSessionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
