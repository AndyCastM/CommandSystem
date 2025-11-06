import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCompanyProductDto } from '../dto/create-company_product.dto';
import { UpdateCompanyProductDto } from '../dto/update-company_product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompanyProductsValidators } from './company_products.validators';
import { formatResponse } from 'src/common/helpers/response.helper';

@Injectable()
export class CompanyProductsService {
  
  constructor (private prisma: PrismaService, private validators: CompanyProductsValidators){}

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
          preparation_time: dto.preparation_time,
          description: dto.description ?? undefined,
          base_price: Number(dto.base_price),
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

      return product;
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

    const active = is_active === 1 ? true : false;
    // Propagar cambio a todas las sucursales
    await this.prisma.branch_products.updateMany({
      where: { id_company_product },
      data: { is_active: active },
    });
    
    return formatResponse(
      `Producto ${is_active === 1 ? 'activado' : 'desactivado'} correctamente.`,
      updated,
    );
  }
  async updateProduct(id_company_product: number, dto: UpdateCompanyProductDto, id_company: number) {

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
      if (dto.id_category === undefined) {
        throw new BadRequestException('La categoría del producto es requerida para validar duplicados.');
      }
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

/**
 * Cuando se crea una nueva sucursal, clona todos los productos de su empresa
 * en la tabla branch_products, manteniendo la relación con company_products.
 */
async syncProductsToBranch(id_company: number, id_branch: number) {
  // Verificar que la empresa exista
  await this.validators.validateCompanyExists(id_company);
  // Verificar que la sucursal pertenezca a la empresa
  await this.validators.validateBranchInCompany(id_branch, id_company);

  // Obtener todos los productos de la empresa
  const companyProducts = await this.validators.validateCompanyHasProducts(id_company);

  if (companyProducts.length === 0) {
    return formatResponse('No hay productos en la empresa para replicar.', []);
  }

  // Verificar qué productos ya existen en la sucursal
  const existing = await this.prisma.branch_products.findMany({
    where: {
      id_branch,
      id_company_product: { in: companyProducts.map(p => p.id_company_product) },
    },
    select: { id_company_product: true },
  });

  const existingIds = new Set(existing.map(e => e.id_company_product));

  // Filtrar solo los productos que aún no existen
  const toCreate = companyProducts.filter(
    p => !existingIds.has(p.id_company_product)
  );

  if (toCreate.length === 0) {
    return formatResponse('La sucursal ya tiene todos los productos sincronizados.', []);
  }

  // Crear los registros en branch_products
  await this.prisma.branch_products.createMany({
    data: toCreate.map(p => ({
      id_branch,
      id_company_product: p.id_company_product,
    })),
  });

  return formatResponse(
    `Se sincronizaron ${toCreate.length} producto(s) de la empresa con la sucursal.`,
    toCreate,
  );
}

async getProductDetail(id_company_product: number) {
  const product = await this.prisma.company_products.findUnique({
    where: { id_company_product },
    include: {
      product_categories: true,
      product_options: {
        include: {
          product_option_values: true,
          product_option_tiers: true,
        },
      },
      print_areas: true,
    },
  });

  if (!product) {
    throw new NotFoundException('Producto no encontrado.');
  }

  // Formateo del producto para el panel admin
  const formatted = {
    id_company_product: product.id_company_product,
    id_category: product.id_category,
    id_area: product.id_area,
    name: product.name,
    description: product.description,
    base_price: Number(product.base_price),
    image_url: product.image_url,
    is_active: product.is_active,
    category_name: product.product_categories?.name,
    area_name: product.print_areas?.name,
    options: product.product_options.map(o => ({
      id_option: o.id_option,
      name: o.name,
      is_required: o.is_required === 1,
      multi_select: o.multi_select === 1,
      max_selection: o.max_selection,
      values: o.product_option_values.map(v => ({
        id_value: v.id_option_value,
        name: v.name,
        extra_price: Number(v.extra_price),
        is_active: v.is_active,
      })),
      tiers: o.product_option_tiers.map(t => ({
        id_tier: t.id_tier,
        selection_count: t.selection_count,
        extra_price: Number(t.extra_price),
      })),
    })),
  };

  return formatResponse(`Detalle del producto ${product.name}`, formatted);
}

async getCompanyProducts(
  id_company: number,
  filters: { id_category?: number; id_area?: number; search?: string },
) {
  const { id_category, id_area, search } = filters;

  const products = await this.prisma.company_products.findMany({
    where: {
      id_company,
      ...(id_category ? { id_category } : {}),
      ...(id_area ? { id_area } : {}),
      ...(search ? { name: { contains: search } } : {}),
    },
    include: {
      product_categories: true,
      print_areas: true,
    },
    orderBy: { id_category: 'asc' },
  });

  return formatResponse('Lista de productos', products.map(p => ({
    id_company_product: p.id_company_product,
    name: p.name,
    category: p.product_categories?.name,
    area: p.print_areas?.name,
    id_category: p.id_category,
    id_area: p.id_area,
    base_price: Number(p.base_price),
    preparation_time: p.preparation_time,
    is_active: p.is_active,
  })));
}

async getBranchProducts(
  id_branch: number,
  filters: { id_category?: number; id_area?: number; search?: string },
) {
  const { id_category, id_area, search } = filters;

  const products = await this.prisma.branch_products.findMany({
    where: {
      id_branch,
      company_products: {
        is: {
          ...(id_category ? { id_category } : {}),
          ...(id_area ? { id_area } : {}),
          ...(search ? { name: { contains: search } } : {}),
        },
      },
    },
    include: {
      company_products: {
        include: {
          product_categories: true,
          print_areas: true,
        },
      },
    },
    orderBy: {
      company_products: { id_category: 'asc' },
    },
  });

  // === Formato de salida unificado ===
  const formatted = products.map((bp) => ({
    id_branch_product: bp.id_branch_product,
    id_company_product: bp.id_company_product,
    name: bp.company_products.name,
    category: bp.company_products.product_categories?.name,
    area: bp.company_products.print_areas?.name,
    id_category: bp.company_products.id_category,
    id_area: bp.company_products.id_area,
    base_price: Number(bp.company_products.base_price),
    preparation_time: bp.company_products.preparation_time,
    is_active: bp.is_active, 
  }));

  return formatResponse('Lista de productos de la sucursal', formatted);
}

}
