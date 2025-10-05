import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTableLocationDto } from '../dto/create-table_location.dto';
import { UpdateTableLocationDto } from '../dto/update-table_location.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TableLocationsService {
  constructor(private prisma: PrismaService) {}

  async create(id_branch: number, createTableLocationDto: CreateTableLocationDto) {
    const exists = await this.validateNameInBranch(
      createTableLocationDto.name,
      id_branch,
    );

    if (exists) {
      throw new BadRequestException(
        'Ya existe una ubicación de mesa con ese nombre en esta sucursal',
      );
    }

    return this.prisma.table_locations.create({
      data: {
        ...createTableLocationDto,
        id_branch
      }
    });
  }

  async findAll(id_branch: number, isActive?: number) {
    return this.prisma.table_locations.findMany({
      where: {
        id_branch,
        ...(isActive !== undefined ? { is_active: isActive } : {}),
      },
    });
  }

  async findOne(id_location: number) {
    const location = await this.prisma.table_locations.findUnique({
      where: { id_location },
    });
    if (!location) throw new NotFoundException(`Ubicación ${id_location} no encontrada`);
    return location;
  }

  async update(id_location: number, data: UpdateTableLocationDto) {
    const exists = await this.validateNameInBranch(
      UpdateTableLocationDto.name,
      UpdateTableLocationDto.id_branch,
    );

    if (exists) {
      throw new BadRequestException(
        'Ya existe una ubicación de mesa con ese nombre en esta sucursal',
      );
    }
    
    return this.prisma.table_locations.update({
      where: { id_location },
      data,
    });
  }

  /**
   * Activa o desactiva una ubicación y todas sus mesas relacionadas
   */
  async activate(id_location: number, activate: number) {
    // Actualiza la location
    const location = await this.prisma.table_locations.update({
      where: { id_location },
      data: { is_active: activate },
    });

    // Cascada a todas las mesas de esa ubicación
    await this.prisma.tables.updateMany({
      where: { id_location },
      data: { is_active: activate },
    });

    return location;
  }

  /**
   * Verifica si ya existe una ubicación con el mismo nombre en la sucursal
   */
  async validateNameInBranch(name: string, id_branch: number): Promise<boolean> {
    const tableLocation = await this.prisma.table_locations.findFirst({
      where: { name, id_branch },
    });
    return !!tableLocation; // true si existe, false si no
  }
}
