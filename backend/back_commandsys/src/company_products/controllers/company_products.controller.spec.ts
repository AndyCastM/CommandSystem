import { Test, TestingModule } from '@nestjs/testing';
import { CompanyProductsController } from './company_products.controller';
import { CompanyProductsService } from '../services/company_products.service';

describe('CompanyProductsController', () => {
  let controller: CompanyProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyProductsController],
      providers: [CompanyProductsService],
    }).compile();

    controller = module.get<CompanyProductsController>(CompanyProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
