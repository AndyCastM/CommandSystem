import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, Patch } from '@nestjs/common';
import { BranchesService } from '../services/branches.service';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { UpdateBranchDto } from '../dto/update-branch.dto';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  // Aqui tambien se crean los horarios default 
  @Post()
  @Roles(Role.Admin)
  async create(
    @CurrentUser() user: any,
    @Body() createBranchDto: CreateBranchDto) {
    return this.branchesService.create(user.id_company, createBranchDto);
  }

  // Obtener todas las sucursales de una empresa
  @Get()
  @Roles(Role.Admin)
  async findAll(
    @CurrentUser() user: any,
    @Query('is_active') isActive?: string
  ) {
    const filter = isActive === 'false' ? 0 : isActive === 'true' ? 1 : undefined;
    return this.branchesService.findAll(user.id_company, filter);
  }

  // Obtener una sucursal por id
  @Get(':id')
  @Roles(Role.Admin)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.branchesService.findOne(+id, user.id_company);
  }

  // Actualizar una sucursal
  @Patch(':id')
  @Roles(Role.Admin)
  update(
    @Param('id') id: string,
    @Body() updateBranchDto: UpdateBranchDto,
    @CurrentUser() user: any
  ) {
    // Asegurar que la sucursal pertenece a la empresa del usuario
    return this.branchesService.update(+id, user.id_company, updateBranchDto);
  }

  // Eliminar (desactivar) sucursal (soft delete → is_active = 0)
  @Patch(':id')
  @Roles(Role.Admin)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    // Asegurar que la sucursal pertenece a la empresa del usuario
    return this.branchesService.delete(+id, user.id_company);
  }

}


