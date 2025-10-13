import { Module } from '@nestjs/common';
import { CompanyProductsService } from './services/company_products.service';
import { CompanyProductsController } from './controllers/company_products.controller';
import { CompanyProductsValidators } from './services/company_products.validators';
import { CompanyImagesService } from './services/company_images.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports:[CloudinaryModule, AiModule],
  controllers: [CompanyProductsController],
  providers: [CompanyProductsService, CompanyProductsValidators, CompanyImagesService],
  exports: [CompanyProductsService],
})
export class CompanyProductsModule {}
