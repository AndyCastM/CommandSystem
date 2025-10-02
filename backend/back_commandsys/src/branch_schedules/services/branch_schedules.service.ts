import { Injectable } from '@nestjs/common';
import { CreateBranchScheduleDto } from '../dto/create-branch_schedule.dto';
import { UpdateBranchScheduleDto } from '../dto/update-branch_schedule.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { BranchesService } from 'src/branches/services/branches.service';

@Injectable()
export class BranchSchedulesService {
  constructor(
    private prisma: PrismaService, 
    private branchesService: BranchesService) {}


  // Crear todos los dias de la semana para una sucursal
  async createDefaultWeek(id_branch: number) {
    if (!(await this.branchesService.validateBranch(id_branch))) {
      throw new Error(`Sucursal con id ${id_branch} no encontrada`);
    }

    const days = Array.from({ length: 7 }, (_, i) =>  ({ // Dias de la semana del 0 al 6
      id_branch: id_branch,
      day_of_week: i,
      open_time: '09:00',
      close_time: '21:00',
    }));

    return this.prisma.branch_schedules.createMany({ data: days });
  }

  // Obtener horarios de una sucursal
  async getSchedulesByBranch(id_branch: number) {
    if (!(await this.branchesService.validateBranch(id_branch))) {
      throw new Error(`Sucursal con id ${id_branch} no encontrada`);
    }
    return this.prisma.branch_schedules.findMany({
      where: { id_branch },
      orderBy: { day_of_week: 'asc' },
    });
  }

  // Actualizar un dia especifico
  async update (id_branch: number, dto: UpdateBranchScheduleDto) {
    return this.prisma.branch_schedules.updateMany({
      where: { id_branch: id_branch, day_of_week: dto.day_of_week },
      data: {
        open_time: dto.open_time,
        close_time: dto.close_time,
        is_open: dto.is_open,
      },
    });
  }
  

  // Eliminar un día (
  async deactivate(branchId: number, day: number) {
    return this.prisma.branch_schedules.updateMany({
      where: { id_branch: branchId, day_of_week: day },
      data: { is_open: false },
    });
  } 

  // Reactivar un día 
  async activate(branchId: number, day: number) {
    return this.prisma.branch_schedules.updateMany({
      where: { id_branch: branchId, day_of_week: day },
      data: { is_open: true },
    });
  }
  
}
