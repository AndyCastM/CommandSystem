import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateComboDto } from '../dto/create-combo.dto';
import { UpdateComboDto } from '../dto/update-combo.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { formatResponse } from 'src/common/helpers/response.helper';

@Injectable()
export class CombosService {
  constructor(private prisma: PrismaService) {}

  async create(id_company: number, createComboDto: CreateComboDto) {
    const {name, description, base_price, items} = createComboDto;

    const combo = await this.prisma.combos.create({
      data : {
        id_company,
        name,
        description,
        base_price,
        combo_items: {
          create: items.map((item) => ({
            id_company_product: +item.id_company_product,
            quantity: item.quantity,
          })),
      },
    },
    include: {
      combo_items: {
        include: { company_products: true },
      },
    },
  });

    return formatResponse('Combo creado correctamente', combo);
  }

  async getAll(id_company: number) {
    const combos = await this.prisma.combos.findMany({
      where: {
        id_company,
        is_active: 1,
      },
      include: {
        combo_items: {
          include: {
            company_products: {
              include: { product_categories: true},             }
          },
        },
      },
      orderBy: { created_at: 'desc'} 
    });
    return formatResponse('Lista de combos', combos);
  }
  
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
                  product_option_tiers: true, // si usas tiers (por cantidad seleccionada)
                },
              },
            },
          },
        },
      },
    },
  });

  if (!combo) {
    throw new NotFoundException(
      `Combo con id ${id_combo} no encontrado para la empresa ${id_company}`,
    );
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

        // Incluir todas las opciones configurables del producto
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
  };

  return formatResponse(`Detalle del combo ${combo.name}`, formatted);
}



}
