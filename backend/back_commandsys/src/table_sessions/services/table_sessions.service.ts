import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { formatResponse } from 'src/common/helpers/response.helper';

@Injectable()
export class TableSessionsService {
  constructor(private prisma: PrismaService) {}

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

    // Verificar si ya está abierta
    const existing = await this.prisma.table_sessions.findFirst({
      where: { id_table, status: 'open' },
    });

    if (existing) {
      throw new BadRequestException('La mesa ya se encuentra abierta');
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

  async closeTableSession(id_table: number, id_user: number) {
    //  Verificar si la mesa existe
    const table = await this.prisma.tables.findUnique({
      where: { id_table },
    });

    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }

    //  Buscar sesión abierta
    const session = await this.prisma.table_sessions.findFirst({
      where: { id_table, status: 'open' },
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

}
