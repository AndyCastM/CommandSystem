import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProductCategoriesService } from '../services/product_categories.service';
import { CreateProductCategoryDto } from '../dto/create-product_category.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('product-categories')
export class ProductCategoriesController {
  constructor(private readonly productCategoriesService: ProductCategoriesService) {}

  @Get()
  @Roles(Role.Admin, Role.Mesero)
  findAll(
    @CurrentUser() user: any,
  ) {
    return this.productCategoriesService.findAll(user.id_company, 1);
  }
  
  @Post()
  @Roles(Role.Admin)
  create(
    @Body() createProductCategoryDto: CreateProductCategoryDto,
    @CurrentUser() user: any
    ) {
    return this.productCategoriesService.create(user.id_company, createProductCategoryDto);
  }

  // Soft delete → desactivar categoria (y sus productos en cascada)
  @Delete(':id')
  @Roles(Role.Admin)
  async deactivate(@Param('id') id: number) {
    return this.productCategoriesService.activate(+id, 0);
  }

  // Reactivar categoria (y sus productos en cascada)
  @Patch(':id/activate')
  @Roles(Role.Admin)
  async activate(@Param('id') id: number) {
    return this.productCategoriesService.activate(+id, 1);
  }
}
