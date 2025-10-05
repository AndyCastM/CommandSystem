import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BranchSchedulesService } from '../services/branch_schedules.service';
import { UpdateBranchScheduleDto } from '../dto/update-branch_schedule.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('branches/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchSchedulesController {
  constructor(private readonly branchSchedulesService: BranchSchedulesService) {}

  // Inicializar los 7 dias
  @Post('default')
  @Roles(Role.Admin, Role.Gerente)
  createDefaultWeek(
    @Body('id_branch') id_branch: number,
    @CurrentUser() user: any,
  ) {
    return this.branchSchedulesService.createDefaultWeek(id_branch, user.id_company );
  }


  // Obtener todos los horarios de la sucursal CHECAR BIEN LOS ROLES
  @Get()
  @Roles(Role.Admin, Role.Gerente)
  async getAll(
    @CurrentUser() user: any,
  ) {
    return this.branchSchedulesService.getSchedulesByBranch(+user.id_branch, user.id_company);
  }

  // Actualizar un dia especifico
  @Patch('update')
  @Roles(Role.Gerente)
  async update(
    @CurrentUser() user: any,
    @Body() dto: UpdateBranchScheduleDto,
  ) {
    return this.branchSchedulesService.update(+user.id_branch, dto);
  }

  // Desactivar un dia
  @Patch(':day/deactivate')
  @Roles(Role.Gerente)
  async deactivate(
    @Param('day') day: number,
    @CurrentUser() user: any,
  ) {
    return this.branchSchedulesService.deactivate(+user.id_branch, +day);
  }

  // Reactivar un dia
  @Patch(':day/activate')
  @Roles(Role.Gerente)
  async activate(
    @CurrentUser() user: any,
    @Param('day') day: number,
  ) {
    return this.branchSchedulesService.activate(+user.id_branch, +day);
  }

}
