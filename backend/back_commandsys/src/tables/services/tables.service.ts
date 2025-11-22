import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTableDto } from '../dto/create-table.dto';
import { UpdateTableDto } from '../dto/update-table.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { formatResponse } from 'src/common/helpers/response.helper';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crear una mesa nueva validando duplicados y pertenencia de location
   */
  async create(id_branch: number, createTableDto: CreateTableDto) {
    const { number, id_location } = createTableDto;
    //console.log(id_branch);

    // Verificar si ya existe una mesa con el mismo número en la sucursal
    const exists = await this.validateNameInBranch(number, id_branch);
    if (exists) {
      throw new BadRequestException(
        'Ya existe una mesa con ese número en esta sucursal',
      );
    }

    // Validar que la location pertenezca a la misma sucursal y que esté activa
    await this.validateLocationInBranch(id_location, id_branch);

    const table = await this.prisma.tables.create({ 
      data:{
        ...createTableDto,
        id_branch,
      } 
    });

    return formatResponse(
      `Mesa "${table.number}" creada correctamente`,
      table,
    );

  }

  /**
   * Listar mesas por sucursal (con filtro por is_active)
   */
  async findAll(id_branch: number, isActive?: number) {
    return this.prisma.tables.findMany({
      where: {
        id_branch,
        ...(isActive !== undefined ? { is_active: isActive } : {}),
      },
      include: { table_locations: true },
    });
  }

  /**
   * Buscar una mesa específica
   */
  async findOne(id_table: number) {
    const table = await this.prisma.tables.findUnique({
      where: { id_table },
      include: { table_locations: true },
    });
    if (!table)
      throw new NotFoundException(`Mesa con id ${id_table} no encontrada`);
    return table;
  }

  /**
   * Actualizar mesa
   */
  async update(id_table: number, data: UpdateTableDto) {
    const table = await this.prisma.tables.update({
      where: { id_table },
      data,
    });

    return formatResponse(
      `Mesa "${table.number}" actualizada correctamente`,
      table,
    );
  }

  /**
   * Desactivar mesa (soft delete)
   */
  async deactivate(id_table: number) {
    const table = await this.prisma.tables.findUnique({ where: { id_table } });
    if (!table) throw new NotFoundException(`Mesa ${id_table} no encontrada`);

    const table2 = await this.prisma.tables.update({
      where: { id_table },
      data: { is_active: 0 },
    });

    return formatResponse(
      `Mesa "${table.number}" desactivada correctamente`,
      table2,
    );
  }

  /**
   * Reactivar mesa
   */
  async activate(id_table: number) {
    const table = await this.prisma.tables.findUnique({ where: { id_table } });
    if (!table) throw new NotFoundException(`Mesa ${id_table} no encontrada`);

    const table2 = await this.prisma.tables.update({
      where: { id_table },
      data: { is_active: 1 },
    });

    return formatResponse(
      `Mesa "${table.number}" activada correctamente`,
      table2,
    );
  }

  /**
   * Verifica si ya existe una mesa con el mismo número en la sucursal
   */
  async validateNameInBranch(number: string, id_branch: number): Promise<boolean> {
    const table = await this.prisma.tables.findFirst({
      where: { number, id_branch },
    });
    return !!table;
  }

  /**
   * Valida que una location pertenezca a una sucursal y que este activa
   */

  async validateLocationInBranch(id_location: number, id_branch: number): Promise<boolean> {
    const location = await this.prisma.table_locations.findUnique({
      where: { id_location },
    });
    
    if (!location) {
      throw new NotFoundException(`Ubicación con id ${id_location} no encontrada`);
    }

    if (location.id_branch !== id_branch) {
      throw new BadRequestException('La ubicación seleccionada no pertenece a la misma sucursal');    
    }

    if (location.is_active === 0) {
      throw new BadRequestException('La ubicación seleccionada está desactivada');
    }

    return !!location;
  }

  /**
   * Obtiene los estados de ocupacion de las sesiones de las mesas
   */
  async getTablesWithStatus(id_branch: number) {
    const tables = await this.prisma.tables.findMany({
      where: { id_branch },
      include: {
        table_locations: true,
        table_sessions: {
          where: { status: { in: ['open', 'occupied'] } },
          select: {
            id_session: true,
            id_user: true,
            guests: true,
            status: true,
            opened_at: true,
          },
        },
      },
    });

    return tables.map((t) => {
      const session = t.table_sessions[0] ?? null;

      return {
        id: t.id_table,
        name: t.number,
        seats: t.capacity,
        location: t.table_locations.name,

        //  status real
        status: session
          ? session.status === 'open'
            ? 'Abierta'
            : 'Ocupada'
          : 'Disponible',

        // dueño de la mesa
        id_user: session?.id_user ?? null,

        // sesión activa
        id_session: session?.id_session ?? null,

        // apertura de sesión
        opened_at: session?.opened_at ?? null,
      };
    });
  }


}
