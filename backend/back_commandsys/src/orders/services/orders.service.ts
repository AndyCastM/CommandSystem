import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { orders_status } from 'generated/prisma';
import { CreateOrderDto } from '../dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

   async createOrder(dto: CreateOrderDto, id_branch, id_user) {
    // Validaciones lógicas
    if (dto.order_type === 'dine_in' && !dto.id_session) {
      throw new BadRequestException('Una orden dine_in requiere id_session.');
    }

    if (dto.order_type !== 'dine_in' && dto.id_session) {
      throw new BadRequestException('Los pedidos takeout/delivery no deben tener id_session.');
    }

    // Sesión (null si no aplica)
    const sessionId = dto.id_session ?? null;

    //  Crear la orden principal
    const order = await this.prisma.orders.create({
      data: {
        id_branch: id_branch,
        id_session: sessionId,
        id_user: id_user,
        status: 'pending',
      },
    });

    //  Recorrer cada ítem del pedido
    for (const item of dto.items) {
      // Caso 1: Producto individual normal
      if (item.id_branch_product) {
        const createdItem = await this.prisma.order_items.create({
          data: {
            id_order: order.id_order,
            id_branch_product: item.id_branch_product,
            quantity: item.quantity,
            notes: item.notes ?? null,
            status: 'pending',
          },
        });

        // Si tiene opciones (tamaño, sabor, etc.)
        if (item.options?.length) {
          for (const opt of item.options) {
            await this.prisma.order_item_options.create({
              data: {
                id_order_item: createdItem.id_order_item,
                id_option_value: opt.id_option_value,
              },
            });
          }
        }
      }

      // Caso 2: Combo configurable
      if (item.id_combo) {
        const createdCombo = await this.prisma.order_items.create({
          data: {
            id_order: order.id_order,
            id_combo: item.id_combo,
            quantity: item.quantity,
            notes: item.notes ?? null,
            status: 'pending',
          },
        });

        // Recorrer los grupos del combo (bebidas, acompañamientos, etc.)
        if (item.combo_groups?.length) {
          for (const group of item.combo_groups) {
            // Cada grupo puede tener varias opciones seleccionadas
            for (const selected of group.selected_options) {
              await this.prisma.order_item_options.create({
                data: {
                  id_order_item: createdCombo.id_order_item,
                  id_option_value: selected.id_company_product, // se reusa el campo como referencia del producto
                },
              });
            }
          }
        }
      }
    }

    //  Retornar la orden completa con todos los detalles
    const fullOrder = await this.prisma.orders.findUnique({
      where: { id_order: order.id_order },
      include: {
        order_items: {
          include: {
            branch_products: {
              include: {
                company_products: {
                  include: {
                    print_areas: true,
                    product_options: {
                      include: { product_option_values: true },
                    },
                  },
                },
              },
            },
            combos: {
              include: {
                combo_groups: {
                  include: {
                    combo_group_options: {
                      include: { company_products: { include: { print_areas: true } } },
                    },
                  },
                },
              },
            },
            order_item_options: {
              include: {
                product_option_values: {
                  include: { product_options: true },
                },
              },
            },
          },
        },
      },
    });

    return {
      message: 'Comanda creada correctamente',
      order: fullOrder,
    };
  }

  async getOrderById(id: number) {
    return this.prisma.orders.findUnique({
      where: { id_order: id },
      include: {
        order_items: {
          include: {
            branch_products: {
              include: {
                company_products: {
                  select: { name: true, image_url: true },
                },
              },
            },
          },
        },
        payments: true,
        table_sessions: { include: { tables: true } },
      },
    });
  }

  async getActiveOrdersByBranch(id_branch: number) {
    return this.prisma.orders.findMany({
      where: {
        id_branch,
        NOT: [{ status: 'delivered' }, { status: 'cancelled' }],
      },
      include: {
        order_items: { select: { id_order_item: true, status: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateOrderStatus(id_order: number, status: orders_status) {
    const validStatuses = ['pending', 'in_progress', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Estado inválido');
    }

    return this.prisma.orders.update({
      where: { id_order },
      data: { status },
    });
  }
}
