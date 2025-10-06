import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyProductDto } from './create-company_product.dto';

export class UpdateCompanyProductDto extends PartialType(CreateCompanyProductDto) {}
