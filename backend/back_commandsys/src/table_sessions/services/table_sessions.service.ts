import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { formatResponse } from 'src/common/helpers/response.helper';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

@Injectable()
export class TableSessionsService {
  private logger = new Logger(TableSessionsService.name);
  constructor(
    private prisma: PrismaService,
    private notif: NotificationsGateway
  ) {}

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

     // Verificar si ya está abierta u ocupada
    const existing = await this.prisma.table_sessions.findFirst({
      where: { 
        id_table, 
        status: { in: ['open', 'occupied'] } 
      },
      include: {
        tables: true,
        users: { select: { name: true, last_name: true } },
      },
    });

    // Si ya existe una sesión abierta u ocupada, retornarla
    if (existing) {
      return formatResponse(
        `Mesa ${table.number} ya estaba abierta.`,
        existing
      );
    }

    // Crear nueva sesión
    const session = await this.prisma.table_sessions.create({
      data: {
        id_table,
        id_user,
        guests,
        status: 'open',
      },
      include: {
        tables: true,
        users: { select: { name: true, last_name: true } },
      },
    });

    return formatResponse
    (
      `Mesa ${table.number} abierta con ${guests} comensales.`,
      session,
    );
    
  }

  // Cambiar a occupied cuando se toma la orden
  async markOccupiedByTable(id_table: number, id_user: number) {
    
    await this.validateTableOwnership(id_table, id_user);

    const session = await this.prisma.table_sessions.findFirst({ where: { id_table, status: 'open' }, include: { tables: true } });
    if (!session) throw new BadRequestException('No hay sesión abierta para esta mesa');
    const updated = await this.prisma.table_sessions.update({
      where: { id_session: session.id_session },
      data: { status: 'occupied' },
      include: { tables: true },
    });

    return formatResponse(`Mesa ${updated.tables.number} ahora está ocupada.`, updated );
  }

  async closeTableSession(id_table: number, id_user: number) {
    
    // Validar dueño de la mesa
    await this.validateTableOwnership(id_table, id_user);

    //  Verificar si la mesa existe
    const table = await this.prisma.tables.findUnique({
      where: { id_table },
    });

    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }

    //  Buscar sesión abierta
    const session = await this.prisma.table_sessions.findFirst({
      where: { id_table,  status: { in: ['open', 'occupied']}},
    });

    if (!session) {
      throw new BadRequestException('La mesa no tiene una sesión abierta actualmente');
    }

    //  Cerrar la sesión
    const closed = await this.prisma.table_sessions.update({
      where: { id_session: session.id_session },
      data: {
        status: 'closed',
        closed_at: new Date(),
      },
      include: {
        tables: true,
        users: { select: { name: true, last_name: true } },
      },
    });

    return formatResponse(
      `Mesa ${table.number} cerrada exitosamente.`,
      closed,
    );
  }

  public async validateTableOwnership(id_table: number, id_user: number) {
    const session = await this.prisma.table_sessions.findFirst({
      where: { 
        id_table, 
        status: { in: ['open', 'occupied'] }
      }
    });

    if (!session) {
      throw new BadRequestException('La mesa no tiene una sesión abierta');
    }

    if (session.id_user !== id_user) {
      throw new BadRequestException('Esta mesa pertenece a otro mesero.');
    }

    return session;
  }

  // Cron,,, cada min detecta las mesas open por +5 min y emite notif a una sucursal especifica
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
