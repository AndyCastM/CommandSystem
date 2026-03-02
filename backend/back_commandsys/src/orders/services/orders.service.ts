import { Injectable, BadRequestException , ForbiddenException, NotFoundException} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { orders_status, order_items_status } from 'generated/prisma';
import { CreateOrderDto, OrderItemDto } from '../dto/create-order.dto';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { TableSessionsService } from 'src/table_sessions/services/table_sessions.service';
import { CancelItemDto } from '../dto/cancel-item.dto';
import { CancelOrderDto } from '../dto/cancel-order.dto';
import { PrintService } from 'src/print/services/print.service';
import { buildTicketFormat } from 'src/print/formatters/ticket.formatter';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, 
    private notif: NotificationsGateway, 
    private tables: TableSessionsService,
    private printService: PrintService) {}

  private getLocalDate(): Date {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local;
  }


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
        created_at: this.getLocalDate(),
      },
    });

    // FUNCIÓN PARA CALCULAR PRECIOS (por item individual)
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

    //  INSERTAR ITEMS — UNO POR UNO (quantity > 1 = N items)
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
            created_at: this.getLocalDate(),
            group_number: item.group_number ?? 1,
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

    //  RETORNAR ORDEN COMPLETA REFRESCADA
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
    //await this.printOrder(order.id_order);
    
    const [_, display] = await Promise.all([
      this.printOrder(order.id_order),
      this.getOrderDisplay(order.id_order)
    ]);

    // A pantallas Angular (cocina, meseros)
    this.notif.emitToBranch(order.id_branch, 'order:new', display);

    return {
      message: 'Comanda creada correctamente',
      order: fullOrder,
      display
    };
  }


  async getOrderById(id: number) {
    return this.prisma.orders.findUnique({
      where: { id_order: id },
      include: {
        // ITEMS DE LA ORDEN
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

        // PAGOS
        payments: true,

        // SESIÓN DE MESA (si es dine_in)
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

        // INFO DEL USUARIO QUE CREÓ LA COMANDA
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

  // OrdersService

async getItemsByGroup(
  id_order: number,
  group_number: number,
  areaId: number,
  includeCancelled = false
) {
  return this.prisma.order_items.findMany({
    where: {
      id_order,
      group_number,
      ...(includeCancelled
        ? {} // incluir todos
        : { status: { not: 'cancelled' } }),

      branch_products: {
        company_products: {
          id_area: areaId
        }
      }
    },
    include: {
      branch_products: {
        include: {
          company_products: true
        }
      }
    }
  });
}


async updateGroupStatus(
  id_order: number,
  group_number: number,
  status: order_items_status,
  areaId?: number,
) {

  const whereCondition: any = {
    id_order,
    group_number,
    status: { not: 'cancelled' },
  };

  // Solo agregar filtro por área si viene definido
  if (areaId) {
    whereCondition.branch_products = {
      company_products: {
        id_area: areaId,
      },
    };
  }

  // 1) OBTENER SOLO ITEMS DE ESE GRUPO Y ESA ÁREA
  const items = await this.prisma.order_items.findMany({
    where: {
      id_order,
      group_number,
      status: { not: 'cancelled' },
      branch_products: {
        company_products: {
          id_area: areaId,
        },
      },
    },
    include: {
      orders: {
        include: {
          table_sessions: { include: { tables: true } },
          users: true,
        }
      },
      branch_products: {
        include: {
          company_products: true,
        }
      }
    }
  });

  // Si NO hay items de esa área → no actualizar nada
  if (items.length === 0) {
    return { count: 0, area_filtered: true };
  }

  const now = this.nowLocal();

  // 2) UPDATE SOLO EN ESA ÁREA
  const result = await this.prisma.order_items.updateMany({
    where: {
      id_order,
      group_number,
      status: { not: 'cancelled' },
      branch_products: {
        company_products: {
          id_area: areaId,
        },
      },
    },
    data: {
      status,
      ...(status === 'in_preparation' ? { start_time: now } : {}),
      ...(status === 'ready'         ? { ready_time: now } : {}),
      ...(status === 'delivered'     ? { delivered_time: now } : {}),
    },
  });

  // 3) NOTIFICAR SOLO SI ES "ready"
  if (status === 'ready') {

    const waiterId = items[0].orders.id_user!;
    const tableNumber = items[0].orders.table_sessions?.tables?.number ?? null;

    // Construir texto amigable
    const itemsText = items
      .map(i => `${i.quantity}× ${i.branch_products!.company_products.name}`)
      .join(', ');

    const message = `Grupo ${group_number} listo • Mesa ${tableNumber ?? 'N/A'} • ${itemsText}`;

    this.notif.emitToUser(
      waiterId,
      'order:group-ready',
      {
        order: id_order,
        group: group_number,
        table: tableNumber,
        items: items.map(i => ({
          product: i.branch_products!.company_products.name,
          qty: i.quantity,
        })),
        message,
      }
    );
  }

  return {
    updated_count: result.count,
    area_filtered: false,
  };
}



  async getActiveOrdersByBranch(id_branch: number, id_user?: number, filterByUser = false) {
    const orders = await this.prisma.orders.findMany({
      where: {
        id_branch,
        // id_user,
        ...(filterByUser && id_user ? { id_user } : {}), // solo filtra si es mesero
        OR:[
          // Ordenes de mesa estan activas por status
          {
            order_type : 'dine_in',
            status: {in: ['pending', 'in_progress', 'ready']},
          },
          // Ordenes para llevar estan activas mientras no esten pagadas
          {
            order_type: 'takeout',
            status: {not: 'cancelled'},
            OR: [
              { payment_status: null },
              { payment_status: { not: 'paid' } }
            ]
          },
        ]
        //status: { in: ['pending', 'in_progress', 'ready'] }, // excluye canceladas/cerradas
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
        total, 
        payment_status: o.payment_status,

        table_sessions: o.table_sessions,
        order_items: o.order_items.map((oi) => ({
          id_order_item: oi.id_order_item,
          status: oi.status,
          notes: oi.notes,
          quantity: oi.quantity, // ahora siempre 1
          unit_price: Number(oi.unit_price ?? 0),
          subtotal: Number(oi.subtotal ?? 0),
          group_number: oi.group_number ?? 1,

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

  private nowLocal(): Date {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  }

  async updateItemStatus(id_order_item: number, status: order_items_status) {
    const validStatuses = ['pending', 'in_preparation', 'ready', 'delivered'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Estado inválido');
    }

    // Timestamp segun el status
    let timestampField: any = {};

    const now = this.nowLocal();

    if (status === 'in_preparation') {
      timestampField = { start_time: now };
    }

    if (status === 'ready') {
      timestampField = { ready_time: now };
    }

    if (status === 'delivered') {
      timestampField = { delivered_time: now };
    }

    const item = await this.prisma.order_items.update({
      where: { id_order_item },
      data: { status, ...timestampField, },
      include: {
        orders: {
          include: {
            table_sessions: {
              include: { tables: true }
            },
            order_items: true,
            users: true,
          }
        },
        branch_products: {
          include: {
            company_products: true
          }
        }
      }
    });

    this.notif.emitToBranch(
      item.orders.id_branch,
      'order_item:status',
      {
        id_order_item: item.id_order_item,
        status: item.status,
      }
    );

    //console.log('NOTIF ES:', this.notif);

    // Si está listo -> mandar notificación
    if (status === 'ready') {
      const waiterId = item.orders.id_user!; // mesero dueño de la comanda
      console.log('Se mando la comanda al mesero: ', waiterId);
      this.notif.emitToUser(
        waiterId,
        'order:item-ready',
        {
          order: item.orders.id_order,
          table: item.orders.table_sessions?.tables?.number ?? null,
          id_user: waiterId,
          product: item.branch_products!.company_products.name,
          qty: item.quantity,
        }
      );
    }

    // Si TODOS los items están entregados → cerrar comanda
    const allDelivered = item.orders.order_items.every(
      (i) => i.status === 'delivered' || i.status === 'cancelled'
    );

    if (allDelivered) {
      await this.prisma.orders.update({
        where: { id_order: item.orders.id_order },
        data: { status: 'delivered' },
      });

      // Notificar a los meseros (para refrescar lista)
      this.notif.emitToUser(
        item.orders.id_user!,
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

    // ya cancelado -> no duplicar auditoría
    if (item.status === 'ready') {
      throw new BadRequestException('No puedes cancelar un producto que ya está listo');
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
          created_at: this.getLocalDate()
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
    this.notif.emitToBranch(
       updated.orders.id_branch,
       'order:item-cancelled',
       { id_order_item, id_order: updated.id_order, reason: dto.reason, user: id_user },
    );

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

     // si hay algún delivered, bloquear
    const hasReady = order.order_items.some(
      (i) => i.status === 'ready',
    );
    if (hasReady) {
      throw new BadRequestException(
        'No se puede cancelar completamente una comanda con productos listos',
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
          include: {
            order_items: true,
          },
        },
      },
    });

    if (!session) throw new NotFoundException('Sesión no encontrada');

    // 0) Validar que no tenga ya cuenta solicitada / pagada
    const hasLockedPayments = session.orders.some((o) =>
      o.status !== 'cancelled' && (
        o.payment_status === 'pending_payment' ||
        o.payment_status === 'paid'
      )
    );

    if (hasLockedPayments) {
      throw new BadRequestException(
        'Esta mesa ya tiene una cuenta solicitada o pagada.',
      );
    }

    // 1) Validar que no haya productos sin entregar
    const hasPendingItems = session.orders.some((o) =>
      o.order_items.some(
        (i) =>
          i.status !== 'delivered' && // no entregado
          i.status !== 'cancelled'    // y no cancelado
      ),
    );

    if (hasPendingItems) {
      throw new BadRequestException(
        'Aún hay productos sin entregar en la mesa. No puedes solicitar la pre-cuenta.',
      );
    }

    // 2) Calcular total SOLO con items no cancelados
    const total = session.orders.reduce((acc, o) => {
      const t = o.order_items
        .filter((i) => i.status !== 'cancelled')
        .reduce((s, i) => s + Number(i.subtotal), 0);

      return acc + t;
    }, 0);

    // // 3) marcar la sesión como pending_payment
    await this.prisma.table_sessions.update({
       where: { id_session },
       data: { status: 'pending_payment' },
    });

    console.log("PREBILL MANDADA: ", id_session, total);
    // Buscar mesero que hizo la petición
    const waiter = await this.prisma.users.findUnique({
      where: { id_user },
      select: { name: true, last_name: true },
    });

    const by_user_name = waiter
    ? `${waiter.name} ${waiter.last_name ?? ''}`.trim()
    : `Usuario #${id_user}`;

    // 4) Notificar a caja
        // 4) Notificar SOLO al cajero (o a sucursal si no hay turno)
    await this.notifyCashierPrebill(session.tables.id_branch, {
      type: 'table',
      id_session,
      table: session.tables.number,
      total,
      orders: session.orders.map((o) => o.id_order),
      by: id_user, // mesero que la solicitó
      by_user_name,
    });


    return { ok: true, total };
  }

  async requestTakeoutPrebill(id_order: number, id_user: number) {
    const order = await this.prisma.orders.findUnique({
      where: { id_order },
      include: {
        order_items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // 1) Validar que no haya productos sin entregar
    const hasPendingItems = order.order_items.some(
      (i) =>
        i.status !== 'delivered' && // no entregado
        i.status !== 'cancelled',   // y no cancelado
    );

    if (order.payment_status === 'pending_payment' || order.payment_status === 'paid') {
      return { ok: true, alreadyRequested: true };
    }
    // EN LOS QUE SON PARA LLEVAR SI PUEDES SOLICITAR LA CUENTA DESDE ANTES
    // if (hasPendingItems) {
    //   throw new BadRequestException(
    //     'Aún hay productos sin entregar en esta orden. No puedes solicitar la pre-cuenta.',
    //   );
    // }

    // 2) Calcular total SOLO con items no cancelados
    const total = order.order_items
      .filter((i) => i.status !== 'cancelled')
      .reduce((sum, i) => sum + Number(i.subtotal), 0);

    // 3) Marcar la orden como pending_payment
    await this.prisma.orders.update({
      where: { id_order },
      data: { payment_status: 'pending_payment' },
    });

    // Buscar mesero que hizo la petición
    const waiter = await this.prisma.users.findUnique({
      where: { id_user },
      select: { name: true, last_name: true },
    });

    const by_user_name = waiter
    ? `${waiter.name} ${waiter.last_name ?? ''}`.trim()
    : `Usuario #${id_user}`;

    // 4) Notificar SOLO al cajero (o sucursal como fallback)
    await this.notifyCashierPrebill(order.id_branch, {
      type: 'takeout',
      id_order,
      customer: order.customer_name,
      total,
      by: id_user, // mesero que la solicitó
      by_user_name,
    });

    console.log('PREBILL TAKEOUT MANDADA: ', id_order, total);

    return { ok: true, total };
  }

  private async notifyCashierPrebill(id_branch: number, payload: any) {
    // Buscar turno de caja abierto en esa sucursal
    const cash = await this.prisma.cash_sessions.findFirst({
      where: {
        id_branch,
        is_closed: false,
      },
      orderBy: { opened_at: 'desc' }, // por si acaso hay más de uno
    });

    if (cash) {
      console.log(
        `Enviando PREBILL solo al cajero ${cash.id_user} en sucursal ${id_branch}`,
      );
      this.notif.emitToUser(cash.id_user, 'prebill', payload);
    } else {
      console.log(
        `No hay turno de caja abierto en sucursal ${id_branch}, enviando PREBILL a toda la sucursal`,
      );
      this.notif.emitToBranch(id_branch, 'prebill', payload);
    }
  }

  async getSessionSummary(id_session: number) {
    const session = await this.prisma.table_sessions.findUnique({
      where: { id_session },
      include: {
        tables: true,
        orders: {
          include: {
            order_items: {
              include: {
                branch_products: {
                  include: {
                    company_products: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    const allItems = session.orders.flatMap((o) =>
      o.order_items.map((i) => ({
        id_order_item: i.id_order_item,
        id_order: i.id_order,
        status: i.status,
        subtotal: Number(i.subtotal || 0),
        created_at: i.created_at,
        product_name: i.branch_products?.company_products?.name ?? 'Producto',
      })),
    );

    const nonCancelled = allItems.filter((i) => i.status !== 'cancelled');

    const total = nonCancelled.reduce((acc, i) => acc + i.subtotal, 0);

    const pendingItems = nonCancelled.filter(
      (i) => i.status !== 'delivered',
    );

    const deliveredTotal = nonCancelled
      .filter((i) => i.status === 'delivered')
      .reduce((acc, i) => acc + i.subtotal, 0);

    return {
      id_session,
      table: session.tables.number,
      total,               // total de la cuenta (sin cancelados)
      deliveredTotal,      // lo que ya está entregado
      pendingCount: pendingItems.length,
      canRequestPrebill: pendingItems.length === 0,
      items: nonCancelled, // para listar qué han pedido
    };
  }


  async printOrder(orderId: number) {
    // 1) Cargar orden completa
    const order = await this.prisma.orders.findUnique({
      where: { id_order: orderId },
      include: {
        branches: { include: { companies: true } },
        users: true,
        table_sessions: { include: { tables: true } },
        order_items: {
          include: {
            branch_products: {
              include: {
                company_products: {
                  include: { print_areas: true }
                }
              }
            },
            order_item_options: {
              include: { product_option_values: true }
            }
          }
        }
      }
    });

    if (!order) throw new Error("Orden no encontrada");

    // 2) Agrupar items por id_area
    const itemsByArea = new Map<number, any[]>();

    for (const item of order.order_items) {
      const areaId = item.branch_products?.company_products?.id_area;
      if (!areaId) continue;

      if (!itemsByArea.has(areaId)) itemsByArea.set(areaId, []);
      itemsByArea.get(areaId)!.push(item);
    }

    // 3) Datos globales
    const company = order.branches.companies;
    const mesa = order.table_sessions?.tables?.number ?? "Sin mesa";
    const mesero = `${order.users?.name ?? ""} ${order.users?.last_name ?? ""}`.trim();

    // 4) Procesar cada área por separado
    for (const [areaId, items] of itemsByArea.entries()) {
      
      // Buscar impresoras asignadas a esta área
      const stations = await this.prisma.branch_print_stations.findMany({
        where: {
          id_branch: order.id_branch,
          id_area: areaId,
          is_active: 1
        }
      });

      if (!stations.length) continue;

      const areaName = items[0].branch_products.company_products.print_areas.name;

      // 5) Construir payload del ticket
      const payload = {
        areaName,
        orderType: (order.order_type ?? "dine_in") as "dine_in" | "takeout",
        id_order: order.id_order,
        mesa,
        mesero,
        created_at: new Date().toLocaleString("es-MX"),

        items: items.map(i => ({
          id_order_item: i.id_order_item,
          quantity: i.quantity,
          name: i.branch_products.company_products.name,
          group: i.group_number ?? 1,
          options: i.order_item_options.map(o => o.product_option_values.name),
          notes: i.notes ?? undefined
        }))
      };

      // 6) Transformar a ticket formateado
      const text = buildTicketFormat(payload);

      // 7) Enviar SOLO a la sucursal correcta
      this.printService.sendTicketToBranch(order.id_branch, text);
    }

    return { ok: true };
  }

  async getOrderDisplay(orderId: number) {
    const order = await this.prisma.orders.findUnique({
      where: { id_order: orderId },
      include: {
        order_items: {
          include: {
            branch_products: {
              include: {
                company_products: {
                  include: { print_areas: true }
                }
              }
            },
            order_item_options: {
              include: {
                product_option_values: true
              }
            }
          }
        }
      }
    });

    if (!order) throw new Error("Orden no encontrada");

    // Agrupar por group_number -> area
    const groups: Record<number, {
      group_number: number;
      stations: Record<number, {
        areaId: number;
        areaName: string;
        items: any[];
      }>;
    }> = {};

    for (const item of order.order_items) {
      const companyProduct = item.branch_products?.company_products;
      if (!companyProduct) continue;

      const areaId   = companyProduct.id_area;
      const areaName = companyProduct.print_areas.name;
      const group    = item.group_number ?? 1;

      if (!groups[group]) {
        groups[group] = { group_number: group, stations: {} };
      }

      if (!groups[group].stations[areaId]) {
        groups[group].stations[areaId] = { areaId, areaName, items: [] };
      }

      groups[group].stations[areaId].items.push({
        id_order_item: item.id_order_item,
        name:          companyProduct.name,
        quantity:      item.quantity,
        options:       item.order_item_options.map(o => o.product_option_values.name),
        notes:         item.notes ?? undefined,
        status:        item.status, // pending | in_preparation | ready | delivered | cancelled
      });
    }

    // Convertir a arrays y separar por columna kanban
    const allItems = Object.values(groups).flatMap(g =>
      Object.values(g.stations).flatMap(s =>
        s.items.map(i => ({ ...i, group_number: g.group_number, areaId: s.areaId, areaName: s.areaName }))
      )
    );

    return {
      id_order: order.id_order,
      groups: Object.values(groups).map(g => ({
        group_number: g.group_number,
        stations: Object.values(g.stations)
      })),
      kanban: {
        pending:        allItems.filter(i => i.status === 'pending'),
        in_preparation: allItems.filter(i => i.status === 'in_preparation'),
        ready:          allItems.filter(i => i.status === 'ready'),
      }
    };
  }

}
