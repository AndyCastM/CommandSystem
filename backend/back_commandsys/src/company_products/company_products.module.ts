import { Module } from '@nestjs/common';
import { CompanyProductsService } from './services/company_products.service';
import { CompanyProductsController } from './controllers/company_products.controller';

@Module({
  controllers: [CompanyProductsController],
  providers: [CompanyProductsService],
})
export class CompanyProductsModule {}
