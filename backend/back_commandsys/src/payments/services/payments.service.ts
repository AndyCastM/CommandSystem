import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createPayment(dto: CreatePaymentDto, id_user: number, id_branch: number) {
    // 1) Validar que la orden exista y sea de la misma sucursal
    const order = await this.prisma.orders.findUnique({
      where: { id_order: dto.id_order },
    });

    if (!order || order.id_branch !== id_branch) {
      throw new BadRequestException('La orden no pertenece a esta sucursal');
    }

    // 2) Obtener turno de caja activo del cajero
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

    // 3) Crear pago
    const payment = await this.prisma.payments.create({
      data: {
        id_order: dto.id_order,
        id_cash_session: cash.id_cash_session,
        method: dto.method,
        amount: dto.amount,
        tip: dto.tip ?? 0,
      },
    });

    // 4) Marcar orden como pagada (si ya cubre total)
    const totalPagado = await this.prisma.payments.aggregate({
      where: { id_order: dto.id_order },
      _sum: { amount: true },
    });

    if (Number(totalPagado._sum.amount || 0) >= Number(order.total)) {
      await this.prisma.orders.update({
        where: { id_order: order.id_order },
        data: { status: 'delivered' },
      });
    }

    return payment;
  }

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
      }
    });

    if (!order) throw new NotFoundException('Orden no encontrada');

    const total = order.order_items
      .filter(i => i.status !== 'cancelled')
      .reduce((acc, i) => acc + Number(i.subtotal), 0);

    return { ...order, total };
  }
}
