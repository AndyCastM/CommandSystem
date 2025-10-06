import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { CompanyProductsService } from '../services/company_products.service';
import { CreateCompanyProductDto } from '../dto/create-company_product.dto';
import { UpdateCompanyProductDto } from '../dto/update-company_product.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';


@Controller('company-products')
export class CompanyProductsController {
  constructor(private readonly companyProductsService: CompanyProductsService) {}

  @Post()
  @Roles(Role.Admin)
  create(
    @Body() dto: CreateCompanyProductDto,
    @CurrentUser() user: any
  ){
    return this.companyProductsService.createProduct(dto, user.id_company);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCompanyProductDto,
    @CurrentUser() user: any
  ){
    return this.companyProductsService.updateProduct(id, dto, user.id_company);
  }

  // ESTO ES PARA EL GERENTE DE LA SUCURSAL, ASI QUE NO DEBERIA DE IR AQUI, O BUENO A LO MEJOR SI
  @Patch('branch/:id_company_product/toggle')
  @Roles(Role.Gerente)
  toggle(
    @Param('id_company_product', ParseIntPipe) id_company_product: number,
    @Body('is_active') is_active: boolean,
    @CurrentUser() user: any
  ) {
    return this.companyProductsService.toggleProduct(user.id_branch, id_company_product, is_active);
  }
}
