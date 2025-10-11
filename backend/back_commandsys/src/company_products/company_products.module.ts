import { Module } from '@nestjs/common';
import { CompanyProductsService } from './services/company_products.service';
import { CompanyProductsController } from './controllers/company_products.controller';
import { CompanyProductsValidators } from './services/company_products.validators';

@Module({
  controllers: [CompanyProductsController],
  providers: [CompanyProductsService, CompanyProductsValidators],
  exports: [CompanyProductsService],
})
export class CompanyProductsModule {}
