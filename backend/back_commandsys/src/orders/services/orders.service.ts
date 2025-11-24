import { Injectable, BadRequestException , ForbiddenException, NotFoundException} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { orders_status, order_items_status } from 'generated/prisma';
import { CreateOrderDto, OrderItemDto } from '../dto/create-order.dto';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { TableSessionsService } from 'src/table_sessions/services/table_sessions.service';
import { CancelItemDto } from '../dto/cancel-item.dto';
import { CancelOrderDto } from '../dto/cancel-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private notif: NotificationsGateway, private tables: TableSessionsService) {}

  async createOrder(dto: CreateOrderDto, id_branch: number, id_user: number) {
    // --- VALIDACIONES GENERALES ---
    if (dto.order_type === 'dine_in' && !dto.id_session) {
      throw new BadRequestException('Una orden dine_in requiere id_session.');
    }

    if (dto.order_type !== 'dine_in' && dto.id_session) {
      throw new BadRequestException('Los pedidos takeout no deben tener id_session.');
    }

    if (dto.order_type === 'takeout' && !dto.customer_name) {
      throw new BadRequestException('Los pedidos para llevar requieren nombre del cliente.');
    }

    // --- VALIDAR SESIÓN Y PROPIETARIO ---
    let id_table: number | null = null;

    if (dto.order_type === 'dine_in') {
      const session = await this.prisma.table_sessions.findUnique({
        where: { id_session: dto.id_session },
      });

      if (!session) throw new BadRequestException('La sesión no existe.');

      id_table = session.id_table;

      await this.tables.validateTableOwnership(id_table, id_user);
    }

    // --- CREAR ORDEN ---
    const order = await this.prisma.orders.create({
      data: {
        id_branch,
        id_session: dto.id_session ?? null,
        id_user,
        notes: dto.notes ?? null,
        status: 'pending',
        order_type: dto.order_type,
        customer_name: dto.order_type === 'takeout' ? dto.customer_name : null,
      },
    });

    // ============================================================
    // FUNCIÓN PARA CALCULAR PRECIOS (por item individual)
    // ============================================================
    const calculateUnitPrice = async (item: OrderItemDto): Promise<number> => {
      let base = 0;

      // PRODUCTO NORMAL
      if (item.id_branch_product) {
        const prod = await this.prisma.branch_products.findUnique({
          where: { id_branch_product: item.id_branch_product },
          include: {
            company_products: {
              include: {
                product_options: {
                  include: { product_option_values: true, product_option_tiers: true }
                }
              }
            }
          }
        });

        if (!prod) throw new BadRequestException('El producto no existe');

        base = Number(prod.company_products.base_price);

        // --- OPCIONES EXTRA ---
        if (item.options?.length) {
          for (const opt of item.options) {
            const val = await this.prisma.product_option_values.findUnique({
              where: { id_option_value: opt.id_option_value }
            });

            if (val) base += Number(val.extra_price);
          }
        }

        // --- TIERS ---
        if (item.options?.length) {
          const groups = prod.company_products.product_options;

          for (const group of groups) {
            const selectedValues = item.options.filter(o => 
              o.id_option_value && 
              group.product_option_values.some(v => v.id_option_value === o.id_option_value)
            );

            const count = selectedValues.length;
            const tier = group.product_option_tiers.find(t => t.selection_count === count);

            if (tier) base += Number(tier.extra_price);
          }
        }
      }

      // COMBO
      if (item.id_combo) {
        const combo = await this.prisma.combos.findUnique({
          where: { id_combo: item.id_combo },
          include: {
            combo_groups: {
              include: {
                combo_group_options: {
                  include: { company_products: true }
                }
              }
            }
          }
        });

        if (!combo) throw new BadRequestException('El combo no existe');

        for (const group of item.combo_groups ?? []) {
          for (const sel of group.selected_options) {
            const optionProduct = await this.prisma.company_products.findUnique({
              where: { id_company_product: sel.id_company_product }
            });

            if (optionProduct) base += Number(optionProduct.base_price);
          }
        }
      }

      return base;
    };

    // ============================================================
    //  INSERTAR ITEMS — UNO POR UNO (quantity > 1 = N items)
    // ============================================================
    for (const item of dto.items) {
      const qty = item.quantity || 1;

      for (let i = 0; i < qty; i++) {
        const unit_price = await calculateUnitPrice(item);

        const createdItem = await this.prisma.order_items.create({
          data: {
            id_order: order.id_order,
            id_branch_product: item.id_branch_product ?? null,
            id_combo: item.id_combo ?? null,
            quantity: 1,
            notes: item.notes ?? null,
            unit_price: unit_price,
            subtotal: unit_price,
            status: 'pending',
          }
        });

        // INSERTAR OPCIONES INDIVIDUALES
        for (const opt of item.options ?? []) {
          await this.prisma.order_item_options.create({
            data: {
              id_order_item: createdItem.id_order_item,
              id_option_value: opt.id_option_value,
            },
          });
        }

        // INSERTAR COMBOS
        for (const group of item.combo_groups ?? []) {
          for (const sel of group.selected_options ?? []) {
            await this.prisma.order_item_options.create({
              data: {
                id_order_item: createdItem.id_order_item,
                id_option_value: sel.id_company_product, // reusamos para combos
              },
            });
          }
        }
      }
    }

    // ============================================================
    //  RETORNAR ORDEN COMPLETA REFRESCADA
    // ============================================================
    const fullOrder = await this.prisma.orders.findUnique({
      where: { id_order: order.id_order },
      include: {
        order_items: {
          include: {
            branch_products: {
              include: {
                company_products: {
                  include: {
                    product_options: { include: { product_option_values: true } },
                  }
                }
              }
            },
            order_item_options: {
              include: { product_option_values: true },
            }
          }
        }
      }
    });

    // recalcular total general
    await this.recalcTotal(order.id_order);

    return {
      message: 'Comanda creada correctamente',
      order: fullOrder
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

  async getActiveOrdersByBranch(id_branch: number, id_user: number) {
  const orders = await this.prisma.orders.findMany({
    where: {
      id_branch,
      id_user,
      status: { in: ['pending', 'in_progress', 'ready'] }, // excluye canceladas/cerradas
    },
    orderBy: { created_at: 'asc' },
    include: {
      table_sessions: {
        include: {
          tables: true,
        },
      },
      order_items: {
        include: {
          branch_products: {
            include: {
              company_products: true,
            },
          },
          order_item_options: {
            include: {
              product_option_values: true,
            },
          },
        },
      },
    },
  });

  // transformar + calcular total dinámico
  return orders.map((o) => {
    // total solo de items no cancelados
    const total = o.order_items
      .filter((i) => i.status !== 'cancelled')
      .reduce((acc, i) => acc + Number(i.subtotal ?? 0), 0);

    return {
      id_order: o.id_order,
      created_at: o.created_at,
      status: o.status,
      order_type: o.order_type,
      customer_name: o.customer_name,
      total, // <-- este es el que usas en el front

      table_sessions: o.table_sessions,
      order_items: o.order_items.map((oi) => ({
        id_order_item: oi.id_order_item,
        status: oi.status,
        notes: oi.notes,
        quantity: oi.quantity, // ahora siempre 1
        unit_price: Number(oi.unit_price ?? 0),
        subtotal: Number(oi.subtotal ?? 0),

        branch_products: oi.branch_products && {
          company_products: oi.branch_products.company_products,
        },

        order_item_options: oi.order_item_options.map((opt) => ({
          product_option_values: opt.product_option_values,
        })),
      })),
    };
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

    console.log('NOTIF ES:', this.notif);

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

  async cancelItem(id_order_item: number, dto: CancelItemDto, id_user: number) {
    const item = await this.prisma.order_items.findUnique({
      where: { id_order_item },
      include: {
        orders: true,
        order_item_cancellations: true,
      },
    });

    if (!item) {
      throw new NotFoundException('El item no existe');
    }

    // ya cancelado -> no duplicar auditoría
    if (item.status === 'cancelled') {
      throw new BadRequestException('Este producto ya fue cancelado anteriormente');
    }

    // no se puede cancelar algo entregado
    if (item.status === 'delivered') {
      throw new BadRequestException(
        'No puedes cancelar un producto que ya fue entregado',
      );
    }

    // validar dueño de la comanda
    if (item.orders.id_user !== id_user) {
      throw new ForbiddenException('No puedes cancelar comandas de otro mesero');
    }

    // 1) marcar item como cancelado
    const updated = await this.prisma.order_items.update({
      where: { id_order_item },
      data: { status: 'cancelled' },
      include: { orders: true },
    });

    // 2) registrar en tabla de auditoría SOLO si no había registro previo
    if (!item.order_item_cancellations?.length) {
      await this.prisma.order_item_cancellations.create({
        data: {
          id_order_item,
          id_user,
          reason: dto.reason,
        },
      });
    }

    // 3) si TODOS los items de la comanda están cancelados -> comanda cancelada
    const remaining = await this.prisma.order_items.count({
      where: {
        id_order: updated.id_order,
        status: { not: 'cancelled' },
      },
    });

    if (remaining === 0) {
      await this.prisma.orders.update({
        where: { id_order: updated.id_order },
        data: { status: 'cancelled' },
      });
    }

    // notificación
    // this.notif.emitToBranch(
    //   updated.orders.id_branch,
    //   'order:item-cancelled',
    //   { id_order_item, id_order: updated.id_order, reason: dto.reason, user: id_user },
    // );

    //  recalcular total
    await this.recalcTotal(updated.id_order);
    
    return {
      message: 'Producto cancelado correctamente',
      id_order_item,
    };
  }


  async cancelOrder(id_order: number, dto: CancelOrderDto, id_user: number) {
    const order = await this.prisma.orders.findUnique({
      where: { id_order },
      include: {
        order_items: {
          include: {
            order_item_cancellations: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('La comanda no existe');
    }

    // validar dueño
    if (order.id_user !== id_user) {
      throw new ForbiddenException('No puedes cancelar comandas de otro mesero');
    }

    // si hay algún delivered, bloquear
    const hasDelivered = order.order_items.some(
      (i) => i.status === 'delivered',
    );
    if (hasDelivered) {
      throw new BadRequestException(
        'No se puede cancelar completamente una comanda con productos entregados',
      );
    }

    // 1) marcar todos los items como cancelados
    await this.prisma.order_items.updateMany({
      where: { id_order },
      data: { status: 'cancelled' },
    });

    // 2) marcar la comanda como cancelada
    await this.prisma.orders.update({
      where: { id_order },
      data: { status: 'cancelled' },
    });

    // 3) registrar cancelación SOLO para los items que NO tienen auditoría previa
    for (const item of order.order_items) {
      const yaTieneAuditoria = item.order_item_cancellations?.length > 0;
      if (!yaTieneAuditoria) {
        await this.prisma.order_item_cancellations.create({
          data: {
            id_order_item: item.id_order_item,
            id_user,
            reason: dto.reason,
          },
        });
      }
    }

    // notificación 
    // this.notif.emitToBranch(order.id_branch, 'order:cancelled', {
    //   id_order,
    //   reason: dto.reason,
    //   user: id_user,
    // });

    // total = 0
    await this.prisma.orders.update({
      where: { id_order },
      data: { total: 0 }
    });

    return { message: 'Comanda cancelada correctamente', id_order };
  }

  async splitItem(id_order_item: number, qtyToSplit: number) {
    const item = await this.prisma.order_items.findUnique({
      where: { id_order_item }
    });

    if (!item) throw new NotFoundException('El item no existe');

    if (qtyToSplit <= 0 || qtyToSplit >= item.quantity)
      throw new BadRequestException('Cantidad inválida para dividir');

    // Crear nuevo item con qtyToSplit
    const newItem = await this.prisma.order_items.create({
      data: {
        id_order: item.id_order,
        id_branch_product: item.id_branch_product,
        quantity: qtyToSplit,
        notes: item.notes,
        status: item.status,
      }
    });

    // Actualizar cantidad original
    await this.prisma.order_items.update({
      where: { id_order_item },
      data: {
        quantity: item.quantity - qtyToSplit
      }
    });

    return newItem;
  }

  /** Recalcula el total de una comanda */
  private async recalcTotal(id_order: number) {
    // Sumamos solo productos NO cancelados
    const r = await this.prisma.order_items.aggregate({
      where: {
        id_order,
        status: { not: 'cancelled' }
      },
      _sum: {
        subtotal: true
      }
    });

    await this.prisma.orders.update({
      where: { id_order },
      data: {
        total: r._sum.subtotal ?? 0
      }
    });
  }

  async requestPrebill(id_session: number, id_user: number) {
    const session = await this.prisma.table_sessions.findUnique({
      where: { id_session },
      include: {
        tables: true,
        orders: {
          where: {
            status: 'delivered' // solo órdenes entregadas
          },
          include: {
            order_items: true
          }
        }
      }
    });

    if (!session) throw new NotFoundException('Sesión no encontrada');

    // Sumar total de TODAS las ordenes dentro de la sesión
    const total = session.orders.reduce((acc, o) => {
      const t = o.order_items
        .filter(i => i.status !== 'cancelled')
        .reduce((s, i) => s + Number(i.subtotal), 0);

      return acc + t;
    }, 0);

    console.log('PREBILL SOLICITADA Y MANDADA', session, total);
    // Notificar a la caja (cajero)
    this.notif.emitToBranch(session.tables.id_branch, 'prebill', {
      id_session,
      table: session.tables.number,
      total,
      orders: session.orders.map(o => o.id_order),
      by: id_user,
    });

    return { ok: true };
  }

}
