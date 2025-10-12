import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { TableLocationsService } from '../services/table_locations.service';
import { CreateTableLocationDto } from '../dto/create-table_location.dto';
import { UpdateTableLocationDto } from '../dto/update-table_location.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

@Controller('branches/locations')
export class TableLocationsController {
  constructor(private readonly service: TableLocationsService) {}

  // Crear una nueva location
  @Post()
  @Roles(Role.Gerente)
  async create(
    @CurrentUser() user : any,
    @Body() createTableLocationDto: CreateTableLocationDto,
  ) {
    return this.service.create(user.id_branch, createTableLocationDto );
  }

  // Listar locations de una sucursal
  @Get('all')
  @Roles(Role.Gerente, Role.Mesero)
  async findAll(
    @CurrentUser() user : any,
    @Query('is_active') is_active?: string,
  ) {
    const filter = is_active ? parseInt(is_active, 10) : undefined;
    return this.service.findAll(+user.id_branch, filter);
  }

  // Buscar una location por id
  @Get(':id')
  @Roles(Role.Gerente, Role.Mesero)
  async findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  // Actualizar datos de una location
  @Patch(':id')
  @Roles(Role.Gerente)
  async update(
    @Param('id') id: string,
    @Body() updateTableLocationDto: UpdateTableLocationDto,
  ) {
    return this.service.update(+id, updateTableLocationDto);
  }

  // Soft delete → desactivar location (y sus mesas en cascada)
  @Delete(':id')
  @Roles(Role.Gerente)
  async deactivate(@Param('id') id: number) {
    return this.service.activate(+id, 0);
  }

  // Reactivar location (y sus mesas en cascada)
  @Patch(':id/activate')
  @Roles(Role.Gerente)
  async activate(@Param('id') id: number) {
    return this.service.activate(+id, 1);
  }
}
