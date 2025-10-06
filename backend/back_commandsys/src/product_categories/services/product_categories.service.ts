import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateProductCategoryDto } from '../dto/create-product_category.dto';
import { UpdateProductCategoryDto } from '../dto/update-product_category.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { formatResponse } from 'src/common/helpers/response.helper';

@Injectable()
export class ProductCategoriesService {
  constructor(private prisma: PrismaService){}

  async create(id_company: number, dto: CreateProductCategoryDto) {
    const exists = await this.validateCategoryInCompany(id_company, dto.name);

    if (exists){
      throw new BadRequestException(
        'Ya existe una categoría con ese nombre en esta empresa',
      );
    }

    const category = await this.prisma.product_categories.create({
      data: {
        ...dto,
        id_company
      }
    });

    return formatResponse(
      `Categoría ${category.name} creada correctamente.`,
      category,
    )
  }

  async findAll(id_company: number, is_active: number) {
    return this.prisma.product_categories.findMany({
      where: {id_company, is_active: is_active}
    });
  }

  async activate(id_category: number, activate: number) {
    // Actualiza la location
    const category = await this.prisma.product_categories.update({
      where: { id_category },
      data: { is_active: activate },
    });

    // Cascada a todos los productos de esa categoría
    await this.prisma.company_products.updateMany({
      where: { id_category },
      data: { is_active: activate },
    });

    return formatResponse(
      `Categoría actualizada correctamente.`,
      category
    )
  }

  async validateCategoryInCompany (id_company: number, name: string): Promise<boolean>{
    const category = await this.prisma.product_categories.findFirst({
      where: {id_company, name},
    });
    return !!category;
  }
}
