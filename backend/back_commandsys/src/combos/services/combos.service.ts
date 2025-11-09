import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateComboDto } from '../dto/create-combo.dto';
import { UpdateComboDto } from '../dto/update-combo.dto';
import { formatResponse } from 'src/common/helpers/response.helper';

@Injectable()
export class CombosService {
  constructor(private prisma: PrismaService) {}

  // Crear combo (soporta items fijos + grupos configurables)
  async create(id_company: number, dto: CreateComboDto) {
    const { name, description, base_price, items, groups } = dto;

    if (!items?.length && !groups?.length) {
      throw new BadRequestException('El combo debe tener al menos un producto o grupo.');
    }

    const combo = await this.prisma.combos.create({
      data: {
        id_company,
        name,
        description,
        base_price,
        combo_items: items?.length
          ? {
              create: items.map((item) => ({
                id_company_product: +item.id_company_product,
                quantity: item.quantity,
              })),
            }
          : undefined,
        combo_groups: groups?.length
          ? {
              create: groups.map((group) => ({
                label: group.label,
                max_selection: group.max_selection || 1,
                is_required: group.is_required ?? true,
                options: {
                  create: group.options.map((opt) => ({
                    id_company_product: +opt.id_company_product,
                    extra_price: opt.extra_price || 0,
                  })),
                },
              })),
            }
          : undefined,
      },
      include: {
        combo_items: { include: { company_products: true } },
        combo_groups: {
          include: {
            combo_group_options: { include: { company_products: true } },
          },
        },
      },
    });

    return formatResponse('Combo creado correctamente', combo);
  }

  // Obtener todos los combos activos
  async getAll(id_company: number) {
    const combos = await this.prisma.combos.findMany({
      where: { id_company },
      include: {
        combo_items: {
          include: {
            company_products: {
              include: { product_categories: true },
            },
          },
        },
        combo_groups: {
          include: {
            combo_group_options: {
              include: {
                company_products: { include: { product_categories: true } },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return formatResponse('Lista de combos', combos);
  }

  // Obtener un combo específico
  async findOne(id_combo: number, id_company: number) {
    const combo = await this.prisma.combos.findUnique({
      where: { id_combo, id_company },
      include: {
        combo_items: {
          include: {
            company_products: {
              include: {
                product_categories: true,
                product_options: {
                  include: {
                    product_option_values: true,
                    product_option_tiers: true,
                  },
                },
              },
            },
          },
        },
        combo_groups: {
          include: {
            combo_group_options: {
              include: {
                company_products: {
                  include: { product_categories: true },
                },
              },
            },
          },
        },
      },
    });

    if (!combo) {
      throw new NotFoundException(`Combo con id ${id_combo} no encontrado para la empresa ${id_company}`);
    }

    const formatted = {
      id_combo: combo.id_combo,
      name: combo.name,
      description: combo.description,
      base_price: Number(combo.base_price),
      is_active: combo.is_active === 1,
      items: combo.combo_items.map((ci) => {
        const product = ci.company_products;
        return {
          id_company_product: product.id_company_product,
          quantity: ci.quantity,
          name: product.name,
          category: product.product_categories?.name,
          base_price: Number(product.base_price),
          description: product.description,
          image_url: product.image_url,
          options: product.product_options.map((opt) => ({
            id_option: opt.id_option,
            name: opt.name,
            is_required: opt.is_required === 1,
            multi_select: opt.multi_select === 1,
            max_selection: opt.max_selection,
            values: opt.product_option_values.map((val) => ({
              id_option_value: val.id_option_value,
              name: val.name,
              extra_price: Number(val.extra_price),
              is_active: val.is_active,
            })),
            tiers: opt.product_option_tiers?.map((tier) => ({
              id_tier: tier.id_tier,
              selection_count: tier.selection_count,
              extra_price: Number(tier.extra_price),
            })),
          })),
        };
      }),
      groups: combo.combo_groups.map((cg) => ({
        id_combo_group: cg.id_combo_group,
        label: cg.label,
        max_selection: cg.max_selection,
        is_required: cg.is_required,
        options: cg.combo_group_options.map((opt) => ({
          id_company_product: opt.company_products.id_company_product,
          name: opt.company_products.name,
          category: opt.company_products.product_categories?.name,
          extra_price: Number(opt.extra_price || 0),
          base_price: Number(opt.company_products.base_price),
        })),
      })),
    };

    return formatResponse(`Detalle del combo ${combo.name}`, formatted);
  }

  // Activar / desactivar combo
  async toggleActive(id_combo: number, id_company: number) {
    const combo = await this.prisma.combos.findUnique({ where: { id_combo, id_company } });

    if (!combo) {
      throw new NotFoundException(`Combo con id ${id_combo} no encontrado`);
    }

    const updated = await this.prisma.combos.update({
      where: { id_combo },
      data: { is_active: combo.is_active === 1 ? 0 : 1 },
    });

    return formatResponse(
      `Combo ${updated.is_active ? 'activado' : 'desactivado'} correctamente`,
      { id_combo: updated.id_combo, is_active: !!updated.is_active },
    );
  }
}
