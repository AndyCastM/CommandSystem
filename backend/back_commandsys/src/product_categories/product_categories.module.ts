import { Module } from '@nestjs/common';
import { ProductCategoriesService } from './services/product_categories.service';
import { ProductCategoriesController } from './controllers/product_categories.controller';

@Module({
  controllers: [ProductCategoriesController],
  providers: [ProductCategoriesService],
})
export class ProductCategoriesModule {}
