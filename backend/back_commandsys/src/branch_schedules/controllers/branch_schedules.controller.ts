import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BranchSchedulesService } from '../services/branch_schedules.service';
import { UpdateBranchScheduleDto } from '../dto/update-branch_schedule.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('branches/:id_branch/schedules')
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
    @Param('id_branch') id_branch: string,
    @CurrentUser() user: any,
  ) {
    return this.branchSchedulesService.getSchedulesByBranch(+id_branch, user.id_company);
  }

  // Actualizar un dia especifico
  @Patch()
  @Roles(Role.Gerente)
  async update(
    @Param('id_branch') id_branch: string,
    @Body() dto: UpdateBranchScheduleDto,
  ) {
    return this.branchSchedulesService.update(+id_branch, dto);
  }

  // Desactivar un dia
  @Patch(':day/deactivate')
  @Roles(Role.Gerente)
  async deactivate(
    @Param('id_branch') id_branch: string,
    @Param('day') day: string,
  ) {
    return this.branchSchedulesService.deactivate(+id_branch, +day);
  }

  // Reactivar un dia
  @Patch(':day/activate')
  @Roles(Role.Gerente)
  async activate(
    @Param('id_branch') id_branch: string,
    @Param('day') day: string,
  ) {
    return this.branchSchedulesService.activate(+id_branch, +day);
  }

}
