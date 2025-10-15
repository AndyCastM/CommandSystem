import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CompanyProductsService } from '../services/company_products.service';
import { CreateCompanyProductDto } from '../dto/create-company_product.dto';
import { UpdateCompanyProductDto } from '../dto/update-company_product.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompanyImagesService } from '../services/company_images.service';

@Controller('company-products')
export class CompanyProductsController {
  constructor(
    private readonly companyProductsService: CompanyProductsService,
    private readonly companyImagesService: CompanyImagesService,
  ) {}

  @Get(':id')
  @Roles(Role.Admin, Role.Gerente, Role.Mesero)
  async getProductDetail(@Param('id') id_company_product: string) {
    return this.companyProductsService.getProductDetail(+id_company_product);
  }

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
    @Body() dto: UpdateCompanyProductDto,
    @CurrentUser() user: any
  ){
    return this.companyProductsService.updateProduct(+id, dto, user.id_company);
  }

  // ESTO ES PARA EL GERENTE DE LA SUCURSAL, ASI QUE NO DEBERIA DE IR AQUI, O BUENO A LO MEJOR SI
  @Patch('branch/:id_branch_product/toggle')
  @Roles(Role.Gerente)
  toggleBranchProduct(
    @Param('id_branch_product', ParseIntPipe) id_branch_product: number,
    @Body('is_active') is_active: boolean,
    @CurrentUser() user: any
  ) {
    return this.companyProductsService.toggleProduct(user.id_branch, id_branch_product, is_active);
  }

  // ESTO ES PARA EL ADMIN DE LA EMPRESA, ADMINISTRADOR DE TODOS LOS PRODUCTOS
  @Patch('company/:id_company_product/toggle')
  @Roles(Role.Admin)
  toggleCompanyProduct(
    @Param('id_company_product', ParseIntPipe) id_company_product: number,
    @Body('is_active') is_active: number,
    @CurrentUser() user: any
  ) {
    return this.companyProductsService.toggleCompanyProduct(user.id_company, id_company_product, is_active);
  }

  @Get()
  @Roles(Role.Admin, Role.Gerente, Role.Mesero)
  async getCompanyProducts(
    @CurrentUser() user: any,
    @Query('id_category') id_category?: string,
    @Query('id_area') id_area?: string,
    @Query('search') search?: string,
  ) {
    return this.companyProductsService.getCompanyProducts(+user.id_company, {
      id_category: id_category ? +id_category : undefined,
      id_area: id_area ? +id_area : undefined,
      search,
  });
}

  // Subir imagen con cloudinary y generar descripción con IA
  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(
    @Param('id') id_product: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.companyImagesService.uploadProductImage(Number(id_product), file);
  }

  @Get(':id_product/images')
  @Roles(Role.Admin, Role.Gerente, Role.Mesero)
  async getProductImages(@Param('id_product', ParseIntPipe) id_product: number) {
    return this.companyImagesService.getImagesByProduct(+id_product);
  }

}
