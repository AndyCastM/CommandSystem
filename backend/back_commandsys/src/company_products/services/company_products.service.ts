import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCompanyProductDto } from '../dto/create-company_product.dto';
import { UpdateCompanyProductDto } from '../dto/update-company_product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompanyProductsValidators } from './company_products.validators';
import { formatResponse } from 'src/common/helpers/response.helper';

@Injectable()
export class CompanyProductsService {
  private validators: CompanyProductsValidators;
  constructor (private prisma: PrismaService){}

   /**
   * Crea un producto de empresa con opciones/valores/tiers y lo replica a TODAS las sucursales de esa empresa.
   */

  async createProduct(dto: CreateCompanyProductDto, id_company: number) {
    
    //Validaciones
    await this.validators.validateCompanyExists(id_company);
    await this.validators.validatePrintArea(dto.id_area);
    await this.validators.validateCategory(dto.id_category, id_company);
    await this.validators.validateDuplicateProduct(dto.name, dto.id_category, id_company);

    return this.prisma.$transaction(async (tx) => {

      //Crear producto base
      const product = await tx.company_products.create({
        data: {
          id_company,
          id_area: dto.id_area,
          id_category: dto.id_category,
          name: dto.name.trim(),
          description: dto.description ?? undefined,
          base_price: Number(dto.base_price),
          image_url: dto.image_url ?? undefined,
        },
      });

      // Crear opciones, valores y tiers (si aplica)
      if (Array.isArray(dto.options) && dto.options.length > 0){
        for (const opt of dto.options){
          const option = await tx.product_options.create({
            data: {
              id_company_product: product.id_company_product,
              name: opt.name.trim(),
              is_required: opt.is_required === 1 ? 1 : 0,
              multi_select: opt.multi_select === 1 ? 1 : 0,
              max_selection: opt.max_selection ?? 1,
            },
          });

          // Crear tiers (niveles de precios depende la seleccion)
          if (Array.isArray(opt.tiers) && opt.tiers.length > 0){
            await tx.product_option_tiers.createMany({
              data: opt.tiers.map((t) => ({
                id_option: option.id_option,
                selection_count: Number(t.selection_count),
                extra_price: Number(t.extra_price ?? 0),
              })),
            });
          }

          // Crear valores
          if (Array.isArray(opt.values) && opt.values.length > 0) {
            await tx.product_option_values.createMany({
              data: opt.values.map((v) => ({
                id_option: option.id_option,
                name: v.name.trim(),
                extra_price: Number(v.extra_price ?? 0)              
              })),
            });
          }
        }
      }

      //Propagar producto a sucursales de la empresa
      const branches = await tx.branches.findMany({
        where: { id_company },
        select: { id_branch: true },
      });

      if (branches.length > 0) {
        await tx.branch_products.createMany({
          data: branches.map((b) => ({
            id_branch: b.id_branch,
            id_company_product: product.id_company_product
          })),
        });
      }

      return formatResponse(
        `Producto ${product.name} creado correctamente y replicado a ${branches.length} sucursal(es).`,
        product,
      );
    });
  }

   /**
   * Activar/desactivar un producto en sucursal.
   */

  async toggleProduct(id_branch: number, id_branch_product: number, is_active: boolean){
    const branchProduct = await this.prisma.branch_products.findFirst({
      where: { id_branch, id_branch_product },
    });

    if (!branchProduct) {
      throw new NotFoundException('Producto no encontrado en esta sucursal.');
    }

    const updated = await this.prisma.branch_products.update({
      where: { id_branch_product: branchProduct.id_branch_product },
      data: { is_active },
    });

    return formatResponse(
      `Producto ${is_active ? 'activado' : 'desactivado'} correctamente.`,
      updated,
    );
  }

  async toggleCompanyProduct(id_company: number, id_company_product: number, is_active: number){
    const companyProduct = await this.prisma.company_products.findFirst({
      where: { id_company, id_company_product },
    });

    if (!companyProduct) {
      throw new NotFoundException('Producto no encontrado en esta empresa.');
    }

    const updated = await this.prisma.company_products.update({
      where: { id_company_product: companyProduct.id_company_product },
      data: { is_active : is_active},
    });

    return formatResponse(
      `Producto ${is_active === 1 ? 'activado' : 'desactivado'} correctamente.`,
      updated,
    );
  }
  async updateProduct(id_company_product: number, dto: CreateCompanyProductDto, id_company: number) {

    // Validaciones básicas
    await this.validators.validateCompanyExists(id_company);

    // Buscar producto
    const existingProduct = await this.prisma.company_products.findFirst({
      where: { id_company_product, id_company },
    });
    if (!existingProduct) {
      throw new NotFoundException('Producto no encontrado.');
    }

    // Verificar duplicado si cambia el nombre o categoría
    if (
      dto.name &&
      (dto.name.trim() !== existingProduct.name ||
        dto.id_category !== existingProduct.id_category)
    ) {
      await this.validators.validateDuplicateProduct(
        dto.name,
        dto.id_category,
        id_company,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Actualizar producto principal
      const updated = await tx.company_products.update({
        where: { id_company_product },
        data: {
          name: dto.name?.trim() ?? existingProduct.name,
          description: dto.description ?? existingProduct.description,
          base_price: Number(dto.base_price ?? existingProduct.base_price),
          id_category: dto.id_category ?? existingProduct.id_category,
          id_area: dto.id_area ?? existingProduct.id_area,
          image_url: dto.image_url ?? existingProduct.image_url,
        },
      });

      // Opcional: actualizar opciones, valores o tiers
      if (dto.options?.length) {
        for (const opt of dto.options) {
          const existingOpt = await tx.product_options.findFirst({
            where: {
              id_company_product,
              name: opt.name.trim(),
            },
          });

          if (existingOpt) {
            await tx.product_options.update({
              where: { id_option: existingOpt.id_option },
              data: {
                is_required: opt.is_required ?? existingOpt.is_required,
                multi_select: opt.multi_select ?? existingOpt.multi_select,
                max_selection: opt.max_selection ?? existingOpt.max_selection,
              },
            });
          } else {
            // Nueva opción
            await tx.product_options.create({
              data: {
                id_company_product,
                name: opt.name.trim(),
                is_required: opt.is_required === 1 ? 1 : 0,
                multi_select: opt.multi_select === 1 ? 1 : 0,
                max_selection: opt.max_selection ?? 1,
              },
            });
          }
        }
      }

      return formatResponse(
        `Producto "${updated.name}" actualizado correctamente.`,
        updated,
      );
  });
}

}
