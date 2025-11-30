import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { formatResponse } from 'src/common/helpers/response.helper';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

const ACTIVE_STATUSES = ['open', 'occupied', 'pending_payment'] as const;

@Injectable()
export class TableSessionsService {
  private logger = new Logger(TableSessionsService.name);

  constructor(
    private prisma: PrismaService,
    private notif: NotificationsGateway,
  ) {}
  
  private getLocalDate(): Date {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local;
  }

  // ABRIR MESA
  async openTableSession(id_table: number, id_user: number, guests: number) {
    // Verificar que la mesa exista
    const table = await this.prisma.tables.findUnique({
      where: { id_table },
    });

    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }

    if (table.is_active === 0) {
      throw new BadRequestException('La mesa está inactiva');
    }

    // Validar capacidad
    if (guests > table.capacity) {
      throw new BadRequestException(
        `La capacidad máxima de esta mesa es ${table.capacity} personas`,
      );
    }

    // Verificar si ya está abierta / ocupada / pendiente de pago
    const existing = await this.prisma.table_sessions.findFirst({
      where: {
        id_table,
        status: { in: ACTIVE_STATUSES as any },
      },
      include: {
        tables: true,
        users: { select: { name: true, last_name: true } },
      },
    });

    // Si ya existe una sesión activa, retornarla
    if (existing) {
      return formatResponse(
        `Mesa ${table.number} ya tiene una sesión activa.`,
        existing,
      );
    }

    // Crear nueva sesión
    const session = await this.prisma.table_sessions.create({
      data: {
        id_table,
        id_user,
        guests,
        status: 'open',
        opened_at: this.getLocalDate(),
      },
      include: {
        tables: true,
        users: { select: { name: true, last_name: true } },
      },
    });

    return formatResponse(
      `Mesa ${table.number} abierta con ${guests} comensales.`,
      session,
    );
  }

  // ===========================
  // MARCAR COMO OCUPADA (ya tomó orden)
  // ===========================
  async markOccupiedByTable(id_table: number, id_user: number) {
    await this.validateTableOwnership(id_table, id_user);

    const session = await this.prisma.table_sessions.findFirst({
      where: { id_table, status: 'open' },
      include: { tables: true },
    });

    if (!session) {
      throw new BadRequestException('No hay sesión abierta para esta mesa');
    }

    const updated = await this.prisma.table_sessions.update({
      where: { id_session: session.id_session },
      data: { status: 'occupied' },
      include: { tables: true },
    });

    return formatResponse(
      `Mesa ${updated.tables.number} ahora está ocupada.`,
      updated,
    );
  }

  // CERRAR SESIÓN "NORMAL" (ya pagada)
  async closeTableSession(id_table: number, id_user: number) {
    console.log("Cerrando sesión para la mesa:", id_table, "por el mesero:", id_user);
    
    // Validar dueño de la mesa
    await this.validateTableOwnership(id_table, id_user);

    // Buscar la mesa
    const table = await this.prisma.tables.findUnique({
      where: { id_table },
    });

    if (!table) {
      console.log("Mesa no encontrada:", id_table);
      throw new NotFoundException('Mesa no encontrada');
    }

    console.log("Mesa encontrada:", table);

    // Buscar la sesión activa (open, occupied, pending_payment o paid)
    const session = await this.prisma.table_sessions.findFirst({
      where: {
        id_table,
        status: { in: ['open', 'occupied', 'pending_payment'] },
      },
    });

    if (!session) {
      console.log("No se encontró sesión activa para la mesa:", id_table);
      throw new BadRequestException(
        'La mesa no tiene una sesión abierta actualmente',
      );
    }

    console.log("Sesión encontrada:", session);

    // Verificar que todas las órdenes estén pagadas
    const orders = await this.prisma.orders.findMany({
      where: { id_session: session.id_session },
    });

    console.log("Órdenes asociadas a la sesión:", orders);

    const unpaidOrders = orders.filter(o => o.payment_status !== 'paid');

    if (unpaidOrders.length > 0) {
      console.log("Órdenes no pagadas:", unpaidOrders);
      throw new BadRequestException('No todas las órdenes han sido pagadas.');
    }

    // Si todo está en orden, cerrar la sesión
    const closed = await this.prisma.table_sessions.update({
      where: { id_session: session.id_session },
      data: {
        status: 'closed',
        closed_at: this.getLocalDate(),
      },
      include: {
        tables: true,
        users: { select: { name: true, last_name: true } },
      },
    });

    console.log("Mesa cerrada exitosamente:", closed);

    return formatResponse(
      `Mesa ${table.number} cerrada exitosamente.`,
      closed,
    );
  }



  // ===========================
  // CERRAR SESIÓN VACÍA (caso:
  // "abrí mesa, se cambiaron de mesa, no pedimos nada")
  // ===========================
  async closeEmptySession(id_table: number, id_user: number) {
    const session = await this.validateTableOwnership(id_table, id_user);

    // Solo permitimos cerrar fácil si está en 'open'
    if (session.status !== 'open') {
      throw new BadRequestException(
        'Solo puedes liberar rápido mesas sin órdenes (estado open).',
      );
    }

    // Validar que no haya órdenes ligadas a esta sesión
    const ordersCount = await this.prisma.orders.count({
      where: { id_session: session.id_session },
    });

    if (ordersCount > 0) {
      throw new BadRequestException(
        'La mesa ya tiene comandas, no se puede liberar como vacía.',
      );
    }

    const table = await this.prisma.tables.findUnique({
      where: { id_table },
    });

    const closed = await this.prisma.table_sessions.update({
      where: { id_session: session.id_session },
      data: {
        status: 'closed',
        closed_at: new Date(),
      },
    });

    return formatResponse(
      `Mesa ${table?.number} liberada sin consumo.`,
      closed,
    );
  }

  // ===========================
  // PONER EN PENDING_PAYMENT
  // (esto normalmente lo llamaría tu flujo de requestPrebill)
  // ===========================
  async markPendingPayment(id_session: number, id_user: number) {
    const session = await this.prisma.table_sessions.findUnique({
      where: { id_session },
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    if (session.id_user !== id_user) {
      throw new BadRequestException('Esta mesa pertenece a otro mesero.');
    }

    if (session.status !== 'occupied') {
      throw new BadRequestException(
        'Solo las mesas ocupadas pueden pasar a pendiente de pago.',
      );
    }

    return this.prisma.table_sessions.update({
      where: { id_session },
      data: { status: 'pending_payment' },
    });
  }

  // ===========================
  // REANUDAR DESPUÉS DE PEDIR LA CUENTA
  // (cliente se arrepiente y sigue pidiendo)
  // ===========================
  async resumeFromPendingPayment(id_session: number, id_user: number) {
    const session = await this.prisma.table_sessions.findUnique({
      where: { id_session },
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    if (session.id_user !== id_user) {
      throw new BadRequestException('Esta mesa pertenece a otro mesero.');
    }

    if (session.status !== 'pending_payment') {
      throw new BadRequestException(
        'La mesa no está en estado pendiente de pago.',
      );
    }

    return this.prisma.table_sessions.update({
      where: { id_session },
      data: { status: 'occupied' },
    });
  }

  // ===========================
  // VALIDAR QUE LA MESA SEA DEL MESERO
  // ===========================
  public async validateTableOwnership(id_table: number, id_user: number) {
    const session = await this.prisma.table_sessions.findFirst({
      where: {
        id_table,
        status: { in: ACTIVE_STATUSES as any },
      },
    });

    if (!session) {
      throw new BadRequestException('La mesa no tiene una sesión abierta');
    }

    if (session.id_user !== id_user) {
      throw new BadRequestException('Esta mesa pertenece a otro mesero.');
    }

    return session;
  }

  // ===========================
  // CRON: mesas open sin orden > 5 minutos
  // ===========================
  @Cron(CronExpression.EVERY_MINUTE)
  async checkOpenSessions() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const sessions = await this.prisma.table_sessions.findMany({
      where: {
        status: 'open',
        opened_at: { lt: fiveMinutesAgo },
      },
      include: {
        tables: { include: { branches: true } },
        users: true,
      },
    });

    for (const s of sessions) {
      this.notif.emitToBranch(s.tables.id_branch, 'alert:table-open', {
        table: s.tables.number,
        branch: s.tables.branches.name,
        guests: s.guests,
        waiter: `${s.users.name} ${s.users.last_name}`,
        message: `La mesa ${s.tables.number} lleva más de 5 minutos abierta sin orden.`,
      });
    }
  }
}
