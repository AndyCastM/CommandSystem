import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { orders_status, order_items_status } from 'generated/prisma';
import { CreateOrderDto } from '../dto/create-order.dto';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { TableSessionsService } from 'src/table_sessions/services/table_sessions.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private notif: NotificationsGateway, private tables: TableSessionsService) {}

   async createOrder(dto: CreateOrderDto, id_branch, id_user) {
    console.log('Usuario creando la comanda:',id_user);

    // Validaciones lógicas
    if (dto.order_type === 'dine_in' && !dto.id_session) {
      throw new BadRequestException('Una orden dine_in requiere id_session.');
    }

    if (dto.order_type !== 'dine_in' && dto.id_session) {
      throw new BadRequestException('Los pedidos takeout/delivery no deben tener id_session.');
    }

    if (dto.order_type === 'takeout' && !dto.customer_name) {
      throw new BadRequestException('Los pedidos para llevar requieren nombre del cliente.');
    }

    // Obtener id_session (puede ser null si takeout)
    const sessionId = dto.id_session ?? null;
    let id_table: number | null = null;

    // Si es pedido dentro del restaurante
    if (dto.order_type === 'dine_in') {
      // Obtener la sesión
      const session = await this.prisma.table_sessions.findUnique({
        where: { id_session: sessionId },
      });

      if (!session) {
        throw new BadRequestException('La sesión de la mesa no existe.');
      }

      id_table = session.id_table;

      //  Validar que el mesero sea el dueño real de la mesa
      await this.tables.validateTableOwnership(id_table, id_user);
    }

    //  Crear la orden principal
    const order = await this.prisma.orders.create({
      data: {
        id_branch: id_branch,
        id_session: sessionId,
        id_user: id_user,
        status: 'pending',
        customer_name: dto.order_type === 'takeout' ? dto.customer_name : null,
        notes: dto.notes ?? null,
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
        // ======================
        // ITEMS DE LA ORDEN
        // ======================
        order_items: {
          include: {
            // Producto normal
            branch_products: {
              include: {
                company_products: {
                  include: {
                    print_areas: true,
                    product_options: {
                      include: {
                        product_option_values: true,
                      },
                    },
                  },
                },
              },
            },

            // Combo configurable
            combos: {
              include: {
                combo_groups: {
                  include: {
                    combo_group_options: {
                      include: {
                        company_products: {
                          include: {
                            print_areas: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },

            // Opciones seleccionadas del item
            order_item_options: {
              include: {
                product_option_values: {
                  include: {
                    product_options: true,
                  },
                },
              },
            },
          },
        },

        // ======================
        // PAGOS
        // ======================
        payments: true,

        // ======================
        // SESIÓN DE MESA (si es dine_in)
        // ======================
        table_sessions: {
          include: {
            tables: true,
            users: {
              select: {
                name: true,
                last_name: true,
              },
            },
          },
        },

        // ======================
        // INFO DEL USUARIO QUE CREÓ LA COMANDA
        // ======================
        users: {
          select: {
            id_user: true,
            name: true,
            last_name: true,
            roles: true,
          },
        },
      },
    });
  }


 async getActiveOrdersByBranch(id_branch: number) {
    const orders = await this.prisma.orders.findMany({
      where: {
        id_branch,
        NOT: [{ status: 'delivered' }, { status: 'cancelled' }],
      },
      orderBy: { created_at: 'desc' },

      include: {
        // sesión dine_in
        table_sessions: {
          include: {
            tables: true,
          },
        },

        order_items: {
          include: {
            branch_products: {
              include: {
                company_products: {
                  include: {
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

            order_item_options: {
              include: {
                product_option_values: true,
              },
            },

            combos: {
              include: {
                combo_groups: {
                  include: {
                    combo_group_options: {
                      include: {
                        company_products: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }
      },
    });

    // === CALCULAR SUBTOTALES DE CADA ITEM ===
    const enriched = orders.map(order => {
      let orderTotal = 0;

      const items = order.order_items.map(oi => {
        const base = oi.branch_products?.company_products?.base_price ?? 0;

        // --- Precio por opciones ---
        const optionsExtra = oi.order_item_options.reduce((acc, opt) => {
          // extra_price can be a number or a Decimal; normalize to number to avoid type errors
          const extra = opt.product_option_values?.extra_price ?? 0;
          return acc + Number(extra);
        }, 0);

        // --- Precio por tiers ---
        let tierExtra = 0;
        if (oi.branch_products?.company_products?.product_options?.length) {
          for (const po of oi.branch_products.company_products.product_options) {
            if (!po.product_option_tiers?.length) continue;

            const selectedValues = oi.order_item_options.filter(
              oio => oio.product_option_values.id_option === po.id_option
            );

            const count = selectedValues.length;

            const tier = po.product_option_tiers.find(t => t.selection_count === count);
            if (tier) tierExtra += Number(tier.extra_price);
          }
        }

        // --- Precio por combos ---
        let comboExtra = 0;
        if (oi.combos) {
          for (const group of oi.combos.combo_groups) {
            for (const sel of group.combo_group_options) {
              comboExtra += Number(sel.company_products?.base_price) ?? 0;
            }
          }
        }

        const subtotal = (Number(base) + Number(optionsExtra) + Number(tierExtra) + Number(comboExtra)) * oi.quantity;
        orderTotal += subtotal;

        return {
          ...oi,
          subtotal,
        };
      });

      return {
        ...order,
        order_items: items,
        total: orderTotal,
      };
    });

    return enriched;
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

  async updateItemStatus(id_order_item: number, status: order_items_status) {
    const validStatuses = ['pending', 'in_preparation', 'ready', 'delivered'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Estado inválido');
    }

    const item = await this.prisma.order_items.update({
      where: { id_order_item },
      data: { status },
      include: {
        orders: {
          include: {
            table_sessions: {
              include: { tables: true }
            },
            order_items: true
          }
        },
        branch_products: {
          include: {
            company_products: true
          }
        }
      }
    });

    // Si está listo -> mandar notificación
    if (status === 'ready') {
      this.notif.emitToBranch(
        item.orders.id_branch,
        'order:item-ready',
        {
          order: item.orders.id_order,
          table: item.orders.table_sessions?.tables?.number ?? null,
          product: item.branch_products!.company_products.name,
          qty: item.quantity,
        }
      );
    }

    // Si TODOS los items están entregados → cerrar comanda
    const allDelivered = item.orders.order_items.every(
      (i) => i.status === 'delivered'
    );

    if (allDelivered) {
      await this.prisma.orders.update({
        where: { id_order: item.orders.id_order },
        data: { status: 'delivered' },
      });

      // Notificar a los meseros (para refrescar lista)
      this.notif.emitToBranch(
        item.orders.id_branch,
        'order:delivered',
        { id_order: item.id_order }
      );
    }
    return item;
  }

}
