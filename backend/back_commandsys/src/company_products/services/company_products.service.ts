import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCompanyProductDto } from '../dto/create-company_product.dto';
import { UpdateCompanyProductDto } from '../dto/update-company_product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompanyProductsValidators } from './company_products.validators';
import { formatResponse } from 'src/common/helpers/response.helper';

@Injectable()
export class CompanyProductsService {
  
  constructor (private prisma: PrismaService, private validators: CompanyProductsValidators){}

  private getLocalDate(): Date {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local;
  }

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
          created_at: this.getLocalDate(),
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
            id_company_product: product.id_company_product,
            created_at: this.getLocalDate(),
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

async updateProduct(
  id_company_product: number,
  dto: UpdateCompanyProductDto,
  id_company: number,
) {
  await this.validators.validateCompanyExists(id_company);
  console.log('ACTUALIZACION RECIBIDA: ', dto);

  const existingProduct = await this.prisma.company_products.findFirst({
    where: { id_company_product, id_company },
  });
  if (!existingProduct) {
    throw new NotFoundException('Producto no encontrado.');
  }

  // Duplicados si cambia nombre/categoría
  if (
    dto.name &&
    (dto.name.trim() !== existingProduct.name ||
      dto.id_category !== existingProduct.id_category)
  ) {
    if (dto.id_category === undefined) {
      throw new BadRequestException(
        'La categoría del producto es requerida para validar duplicados.',
      );
    }
    await this.validators.validateDuplicateProduct(
      dto.name,
      dto.id_category,
      id_company,
    );
  }

  return this.prisma.$transaction(async (tx) => {
    // 1) Producto base (incluye preparation_time)
    const updated = await tx.company_products.update({
      where: { id_company_product },
      data: {
        name: dto.name?.trim() ?? existingProduct.name,
        description: dto.description ?? existingProduct.description,
        base_price: Number(dto.base_price ?? existingProduct.base_price),
        id_category: dto.id_category ?? existingProduct.id_category,
        id_area: dto.id_area ?? existingProduct.id_area,
        preparation_time:
          dto.preparation_time ?? existingProduct.preparation_time,
        updated_at: this.getLocalDate(),
      },
    });

    // 2) Opciones + values + tiers
    if (Array.isArray(dto.options) && dto.options.length > 0) {
      for (const rawOpt of dto.options) {
        const opt: any = rawOpt;
        const name = opt.name?.trim();
        if (!name) continue;

        const isRequired =
          opt.is_required === 1 || opt.is_required === true ? 1 : 0;
        const multiSelect =
          opt.multi_select === 1 || opt.multi_select === true ? 1 : 0;

        // 2.1 Buscar opción por id_option o por (producto+nombre)
        let optionRecord =
          opt.id_option != null
            ? await tx.product_options.findUnique({
                where: { id_option: opt.id_option },
              })
            : null;

        if (!optionRecord) {
          optionRecord = await tx.product_options.findFirst({
            where: { id_company_product, name },
          });
        }

        if (optionRecord) {
          optionRecord = await tx.product_options.update({
            where: { id_option: optionRecord.id_option },
            data: {
              name,
              is_required: isRequired,
              multi_select: multiSelect,
              max_selection:
                opt.max_selection ?? optionRecord.max_selection ?? 1,
            },
          });
        } else {
          optionRecord = await tx.product_options.create({
            data: {
              id_company_product,
              name,
              is_required: isRequired,
              multi_select: multiSelect,
              max_selection: opt.max_selection ?? 1,
            },
          });
        }

        // 2.2 VALUES: upsert + soft delete de los que ya no vengan
        const existingValues = await tx.product_option_values.findMany({
          where: { id_option: optionRecord.id_option },
        });
        const existingValIds = new Set(
          existingValues.map((v) => v.id_option_value),
        );
        const usedValIds = new Set<number>();

        if (Array.isArray(opt.values)) {
          for (const v of opt.values as any[]) {
            const baseData = {
              name: v.name.trim(),
              extra_price: Number(v.extra_price ?? 0),
              is_active: v.is_active === false ? false : true,
            };

            if (v.id_value) {
              await tx.product_option_values.update({
                where: { id_option_value: v.id_value },
                data: baseData,
              });
              usedValIds.add(v.id_value);
            } else {
              const createdVal = await tx.product_option_values.create({
                data: {
                  ...baseData,
                  id_option: optionRecord.id_option,
                },
              });
              usedValIds.add(createdVal.id_option_value);
            }
          }
        }

        // Cualquiera que existía pero ya no viene → marcar inactivo
        const toDisable = [...existingValIds].filter(
          (id) => !usedValIds.has(id),
        );
        if (toDisable.length > 0) {
          await tx.product_option_values.updateMany({
            where: { id_option_value: { in: toDisable } },
            data: { is_active: false },
          });
        }

        // 2.3 TIERS: upsert + borrar los que ya no estén
        const existingTiers = await tx.product_option_tiers.findMany({
          where: { id_option: optionRecord.id_option },
        });
        const existingTierIds = new Set(existingTiers.map((t) => t.id_tier));
        const usedTierIds = new Set<number>();

        if (Array.isArray(opt.tiers)) {
          for (const t of opt.tiers as any[]) {
            const baseData = {
              selection_count: Number(t.selection_count),
              extra_price: Number(t.extra_price ?? 0),
            };

            if (t.id_tier) {
              await tx.product_option_tiers.update({
                where: { id_tier: t.id_tier },
                data: baseData,
              });
              usedTierIds.add(t.id_tier);
            } else {
              const createdTier = await tx.product_option_tiers.create({
                data: {
                  ...baseData,
                  id_option: optionRecord.id_option,
                },
              });
              usedTierIds.add(createdTier.id_tier);
            }
          }
        }

        const tiersToDelete = [...existingTierIds].filter(
          (id) => !usedTierIds.has(id),
        );
        if (tiersToDelete.length > 0) {
          await tx.product_option_tiers.deleteMany({
            where: { id_tier: { in: tiersToDelete } },
          });
        }
      }
    }

    // 3) Volver a leer formateado para tu listado
    const prod = await tx.company_products.findUnique({
      where: { id_company_product: updated.id_company_product },
      include: {
        product_categories: true,
        print_areas: true,
        company_product_images: true,
      },
    });

    const formatted = {
      id_company_product: prod!.id_company_product,
      name: prod!.name,
      category: prod!.product_categories?.name ?? null,
      area: prod!.print_areas?.name ?? null,
      id_category: prod!.id_category,
      id_area: prod!.id_area,
      base_price: Number(prod!.base_price),
      preparation_time: prod!.preparation_time,
      is_active: prod!.is_active,
      image_url: prod!.company_product_images?.[0]?.image_url ?? null,
    };

    return formatResponse(
      `Producto "${formatted.name}" actualizado correctamente.`,
      formatted,
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
      created_at: this.getLocalDate(),
    })),
  });

  return formatResponse(
    `Se sincronizaron ${toCreate.length} producto(s) de la empresa con la sucursal.`,
    toCreate,
  );
}

async getProductDetail(id_branch_product: number) {
  const branchProduct = await this.prisma.branch_products.findUnique({
    where: { id_branch_product },
    include: {
      company_products: {
        include: {
          product_categories: true,
          print_areas: true,
          company_product_images: {
            orderBy: { created_at: 'desc' }, 
          },
          product_options: {
            include: {
              product_option_values: true,
              product_option_tiers: true,
            },
          },
        },
      },
    },
  });

  if (!branchProduct) {
    throw new NotFoundException('Producto no encontrado.');
  }

  const prod = branchProduct.company_products;

  const formatted = {
    id_branch_product: branchProduct.id_branch_product,
    id_company_product: prod.id_company_product,
    id_category: prod.id_category,
    id_area: prod.id_area,
    name: prod.name,
    description: prod.description,
    base_price: Number(prod.base_price),
    image_url: prod.company_product_images?.[0]?.image_url || null,
    is_active: branchProduct.is_active,
    category_name: prod.product_categories?.name,
    area_name: prod.print_areas?.name,
    options: prod.product_options.map(o => ({
      id_option: o.id_option,
      name: o.name,
      is_required: o.is_required === 1,
      multi_select: o.multi_select === 1,
      max_selection: o.max_selection,
      values: o.product_option_values
      .filter(v => v.is_active === true)
      .map(v => ({
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

  return formatResponse(`Detalle del producto ${prod.name}`, formatted);
}

async getCompanyProductDetail(id_company_product: number) {
  const prod = await this.prisma.company_products.findUnique({
    where: { id_company_product },
    include: {
      product_categories: true,
      print_areas: true,
      company_product_images: {
        orderBy: { created_at: 'desc' },
      },
      product_options: {
        include: {
          product_option_values: true,
          product_option_tiers: true,
        },
      },
    },
  });

  if (!prod) {
    throw new NotFoundException('Producto no encontrado.');
  }

  const formatted = {
    id_company_product: prod.id_company_product,
    id_category: prod.id_category,
    id_area: prod.id_area,
    name: prod.name,
    description: prod.description,
    base_price: Number(prod.base_price),
    id_image : prod.company_product_images?.[0]?.id_image,
    image_url: prod.company_product_images?.[0]?.image_url || null,
    is_active: prod.is_active,
    category_name: prod.product_categories?.name,
    area_name: prod.print_areas?.name,
    options: prod.product_options.map(o => ({
      id_option: o.id_option,
      name: o.name,
      is_required: o.is_required === 1,
      multi_select: o.multi_select === 1,
      max_selection: o.max_selection,
      values: o.product_option_values
      .filter(v => v.is_active === true)
      .map(v => ({
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

  return formatResponse(`Detalle del producto ${prod.name}`, formatted);
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
      company_product_images: {
        orderBy: { created_at: 'desc' }, 
      },
    },
    orderBy: { id_category: 'asc' },
  });

  const formatted = products.map((p) => ({
    id_company_product: p.id_company_product,
    name: p.name,
    category: p.product_categories?.name ?? null,
    area: p.print_areas?.name ?? null,
    id_category: p.id_category,
    id_area: p.id_area,
    base_price: Number(p.base_price),
    preparation_time: p.preparation_time,
    is_active: p.is_active,
    image_url: p.company_product_images?.[0]?.image_url ?? null, //  primera imagen
  }));

  return formatResponse('Lista de productos', formatted);
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
