import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createPayment(dto: CreatePaymentDto, id_user: number, id_branch: number) {
    // 1) Obtener turno de caja activo del cajero
    const cash = await this.prisma.cash_sessions.findFirst({
      where: {
        id_user,
        id_branch,
        is_closed: false,
      },
    });

    if (!cash) {
      throw new BadRequestException('No tienes un turno de caja abierto');
    }

    // 2) Pago por UNA sola orden
    if (dto.id_order && !dto.id_orders) {
      return this.createSingleOrderPayment(dto, id_user, id_branch, cash.id_cash_session);
    }

    // 3) Pago por SESIÓN (varias órdenes)
    if (dto.id_orders && dto.id_orders.length > 0) {
      return this.createSessionPayment(dto, id_user, id_branch, cash.id_cash_session);
    }

    throw new BadRequestException('Debes enviar id_order o id_orders');
  }

  // ========================
  // PAGO POR UNA SOLA ORDEN
  // ========================
  private async createSingleOrderPayment(
    dto: CreatePaymentDto,
    id_user: number,
    id_branch: number,
    id_cash_session: number,
  ) {
    const id_order = dto.id_order!;

    // 1) Validar orden
    const order = await this.prisma.orders.findUnique({
      where: { id_order },
      include: { payments: true },
    });

    if (!order) throw new NotFoundException('Orden no encontrada');

    if (order.id_branch !== id_branch) {
      throw new ForbiddenException('La orden no pertenece a esta sucursal');
    }

    // 2) Calcular pendiente
    const alreadyPaid = order.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const pending = Number(order.total ?? 0) - alreadyPaid;

    if (pending <= 0) {
      throw new BadRequestException('La orden ya está totalmente pagada');
    }

    if (dto.amount > pending) {
      throw new BadRequestException(
        `El pago excede el total pendiente. Pendiente: ${pending}`,
      );
    }

    // 3) Crear pago
    const payment = await this.prisma.payments.create({
      data: {
        id_order,
        id_cash_session,
        id_user,
        method: dto.method as any,
        amount: dto.amount,
        tip: dto.tip ?? 0,
      },
    });

    const newPending = pending - dto.amount;

    // 4) Marcar orden como pagada si ya se completó
    if (newPending <= 0) {
      await this.prisma.orders.update({
        where: { id_order },
        data: { payment_status: 'paid' }, 
      });
    }

    return payment;
  }

  // ========================
  // PAGO POR SESIÓN (VARIAS ÓRDENES)
  // ========================
  private async createSessionPayment(
    dto: CreatePaymentDto,
    id_user: number,
    id_branch: number,
    id_cash_session: number,
  ) {
    const orderIds = dto.id_orders!;
    let remaining = dto.amount;
    let remainingTip = dto.tip ?? 0;

    // 1) Traer todas las órdenes
    const orders = await this.prisma.orders.findMany({
      where: {
        id_order: { in: orderIds },
      },
      include: { payments: true },
    });

    if (!orders.length) {
      throw new NotFoundException('No se encontraron órdenes para esta sesión');
    }

    // Validar sucursal
    const invalidBranch = orders.find((o) => o.id_branch !== id_branch);
    if (invalidBranch) {
      throw new ForbiddenException('Hay órdenes que no pertenecen a esta sucursal');
    }

    // Tomamos el id_session de la primera orden (todas deberían compartirlo)
    const sessionId = orders[0].id_session;

    // 2) Calcular pendiente por orden
    const pendingByOrder = orders.map((o) => {
      const alreadyPaid = o.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const pending = Number(o.total ?? 0) - alreadyPaid;
      return { id_order: o.id_order, pending };
    });

    const totalPending = pendingByOrder.reduce(
      (sum, x) => sum + x.pending,
      0,
    );

    if (totalPending <= 0) {
      throw new BadRequestException('La sesión ya está totalmente pagada');
    }

    if (dto.amount > totalPending) {
      throw new BadRequestException(
        `El pago excede el total pendiente de la sesión. Pendiente: ${totalPending}`,
      );
    }

    // 3) Repartir el pago entre las órdenes (en orden)
    const paymentsToCreate: {
      id_order: number;
      amount: number;
      tip: number;
      markPaid: boolean;
    }[] = [];

    for (const item of pendingByOrder) {
      if (remaining <= 0) break;
      if (item.pending <= 0) continue;

      const toPay = Math.min(remaining, item.pending);

      // Tip: opcionalmente solo se aplica a la primera orden que reciba pago
      const tipForThis = remainingTip > 0 ? remainingTip : 0;
      remainingTip = 0;

      paymentsToCreate.push({
        id_order: item.id_order,
        amount: toPay,
        tip: tipForThis,
        markPaid: toPay >= item.pending, // si cubrimos todo lo pendiente de esa orden
      });

      remaining -= toPay;
    }

    // 4) Crear pagos + actualizar estado dentro de una transacción
    await this.prisma.$transaction(async (tx) => {
      for (const p of paymentsToCreate) {
        await tx.payments.create({
          data: {
            id_order: p.id_order,
            id_cash_session,
            id_user,
            method: dto.method as any,
            amount: p.amount,
            tip: p.tip,
          },
        });

        if (p.markPaid) {
          await tx.orders.update({
            where: { id_order: p.id_order },
            data: { payment_status: 'paid' },
          });
        }
      }

      if (sessionId) {
        const sessionOrders = await tx.orders.findMany({
          where: {
            id_session: sessionId,
            status: { not: 'cancelled' },
          },
          select: {
            id_order: true,
            payment_status: true,
          },
        });

        const allPaid = sessionOrders.every(
          (o) => o.payment_status === 'paid',
        );

        if (allPaid) {
          await tx.table_sessions.update({
            where: { id_session: sessionId },
            data: { status: 'paid' }, 
          });
        }
      }
    });

    return { ok: true };
  }

  // ========================
  // REPORTES / QUERIES
  // ========================

  async getPaymentsByCashSession(id_cash_session: number) {
    return this.prisma.payments.findMany({
      where: { id_cash_session },
      orderBy: { created_at: 'asc' },
    });
  }

  async getOrderDetail(id_order: number) {
    const order = await this.prisma.orders.findUnique({
      where: { id_order },
      include: {
        order_items: true,
      },
    });

    if (!order) throw new NotFoundException('Orden no encontrada');

    const total = order.order_items
      .filter((i) => i.status !== 'cancelled')
      .reduce((acc, i) => acc + Number(i.subtotal ?? 0), 0);

    return { ...order, total };
  }

  async getPendingPrebills(id_branch: number) {
    // 1) MESAS con sesión pendiente de pago
    const sessions = await this.prisma.table_sessions.findMany({
      where: {
        status: 'pending_payment',
        tables: {
          id_branch,
        },
      },
      include: {
        tables: true,
        users: true, // mesero de la sesión
        orders: {
          include: {
            order_items: true,
          },
        },
      },
    });

    const tableRequests = sessions.map((s) => {
      const total = s.orders.reduce((acc, o) => {
        const t = o.order_items
          .filter((i) => i.status !== 'cancelled')
          .reduce((sum, i) => sum + Number(i.subtotal ?? 0), 0);
        return acc + t;
      }, 0);

      return {
        type: 'table' as const,
        id_session: s.id_session,
        table: s.tables.number,
        total,
        orders: s.orders.map((o) => o.id_order),
        by_user_name: `${s.users.name} ${s.users.last_name ?? ''}`.trim(),
      };
    });

    // 2) PARA LLEVAR con pago pendiente
    const takeoutOrders = await this.prisma.orders.findMany({
      where: {
        order_type: 'takeout',
        payment_status: 'pending_payment',
        id_branch,
      },
      include: {
        order_items: true,
        users: true,
      },
    });

    const takeoutRequests = takeoutOrders.map((o) => {
      const total = o.order_items
        .filter((i) => i.status !== 'cancelled')
        .reduce((acc, i) => acc + Number(i.subtotal ?? 0), 0);

      return {
        type: 'takeout' as const,
        id_order: o.id_order,
        customer: o.customer_name,
        total,
        by_user_name: `${o.users?.name ?? ''} ${o.users?.last_name ?? ''}`.trim(),
      };
    });

    return [...tableRequests, ...takeoutRequests];
  }

}
