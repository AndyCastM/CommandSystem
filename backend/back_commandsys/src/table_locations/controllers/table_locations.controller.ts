import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { TableLocationsService } from '../services/table_locations.service';
import { CreateTableLocationDto } from '../dto/create-table_location.dto';
import { UpdateTableLocationDto } from '../dto/update-table_location.dto';

@Controller('branches/:branchId/locations')
export class TableLocationsController {
  constructor(private readonly service: TableLocationsService) {}

  // Crear una nueva location
  @Post()
  async create(
    @Param('branchId') branchId: string,
    @Body() dto: CreateTableLocationDto,
  ) {
    return this.service.create({ ...dto, id_branch: +branchId });
  }

  // Listar locations de una sucursal
  @Get()
  async findAll(
    @Param('branchId') branchId: string,
    @Query('is_active') isActive?: string,
  ) {
    const filter = isActive ? parseInt(isActive, 10) : undefined;
    return this.service.findAll(+branchId, filter);
  }

  // Buscar una location por id
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  // Actualizar datos de una location
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTableLocationDto,
  ) {
    return this.service.update(+id, dto);
  }

  // Soft delete → desactivar location (y sus mesas en cascada)
  @Patch(':id')
  async deactivate(@Param('id') id: string) {
    return this.service.activate(+id, 0);
  }

  // Reactivar location (y sus mesas en cascada)
  @Patch(':id/restore')
  async restore(@Param('id') id: string) {
    return this.service.activate(+id, 1);
  }
}
