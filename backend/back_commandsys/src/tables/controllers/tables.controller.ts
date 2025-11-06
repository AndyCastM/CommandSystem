import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TablesService } from '../services/tables.service';
import { CreateTableDto } from '../dto/create-table.dto';
import { UpdateTableDto } from '../dto/update-table.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @Roles(Role.Gerente)
  async create(
    @CurrentUser() user: any,
    @Body() createTableDto: CreateTableDto) {
      return this.tablesService.create(user.id_branch, createTableDto);
  }

  @Get('branch')
  @Roles(Role.Mesero, Role.Gerente)
  async getTablesByBranch(@CurrentUser() user: any) {
    return this.tablesService.getTablesWithStatus(user.id_branch);
  }

  @Get()
  @Roles(Role.Gerente, Role.Mesero)
  async findAll(
    @CurrentUser() user: any,
    @Query('is_active') is_active: string,
  ) {
    const filter = is_active ? parseInt(is_active, 10) : undefined;
    return this.tablesService.findAll(user.id_branch, filter);
  }

  @Get(':id')
  @Roles(Role.Gerente, Role.Mesero)
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const table = await this.tablesService.findOne(+id);
    
    //Verificar que la mesa pertenece a la sucursal del usuario
    if (table.id_branch !== user.id_branch) {
      throw new Error('No autorizado para acceder a esta mesa');
    }
      
    return table;
  }

  @Patch(':id')
  @Roles(Role.Gerente)
  async update(@Param('id') id: string, @Body() updateTableDto: UpdateTableDto, @CurrentUser() user: any) {
    const table = await this.tablesService.findOne(+id); 

    return this.tablesService.update(+id, updateTableDto);
  }

  @Delete(':id')
  @Roles(Role.Gerente)
  async deactivate(@Param('id') id: string, @CurrentUser() user: any) {
    const table = await this.tablesService.findOne(+id);

    return this.tablesService.deactivate(+id);
  }

  @Patch(':id/activate')
  @Roles(Role.Gerente)
  async activate(@Param('id') id: string, @CurrentUser() user: any) {
    const table = await this.tablesService.findOne(+id);

    return this.tablesService.activate(+id);
  }

}
