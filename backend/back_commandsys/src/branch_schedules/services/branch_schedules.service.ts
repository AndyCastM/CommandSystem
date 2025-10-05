import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { UpdateBranchScheduleDto } from '../dto/update-branch_schedule.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { BranchesService } from 'src/branches/services/branches.service';

@Injectable()
export class BranchSchedulesService {
  constructor(
    private prisma: PrismaService, 
    @Inject(forwardRef(() => BranchesService))
    private readonly branchesService: BranchesService,
  ) {}


  // Crear todos los dias de la semana para una sucursal
  async createDefaultWeek(id_branch: number, id_company: number) {
    if (!(await this.branchesService.validateBranchInCompany(id_branch, id_company))) {
      throw new Error(`Sucursal con id ${id_branch} no encontrada`);
    }

    const days = Array.from({ length: 7 }, (_, i) =>  ({ // Dias de la semana del 0 al 6
      id_branch: id_branch,
      day_of_week: i,
      open_time: new Date(`1970-01-01T09:00:00Z`),
      close_time: new Date(`1970-01-01T21:00:00Z`),
    }));

    return this.prisma.branch_schedules.createMany({ data: days });
  }

  // Obtener horarios de una sucursal
  async getSchedulesByBranch(id_branch: number, id_company: number) {
    await this.branchesService.validateBranchInCompany(id_branch, id_company);

    return this.prisma.branch_schedules.findMany({
      where: { id_branch },
      orderBy: { day_of_week: 'asc' },
    });
  }

  // Actualizar un dia especifico
  async update (id_branch: number, dto: UpdateBranchScheduleDto) {
    const day = await this.validateDay(id_branch, dto.day_of_week);
    const data : any = {}

    if (!day.is_open) {
      throw new Error(
        `El día ${dto.day_of_week} está desactivado. No se puede actualizar.`,
      );
    }

    // Si viene open_time en el body
    if (dto.open_time) {
      const [h, m] = dto.open_time.split(':').map(String);
      //console.log(h, m);
      data.open_time = new Date(`1970-01-01T${h}:${m}:00Z`);
      //console.log(data.open_time);
    }

    // Si viene close_time en el body
    if (dto.close_time) {
      const [h, m] = dto.close_time.split(':').map(String);
      data.close_time = new Date(`1970-01-01T${h}:${m}:00Z`);
    }

    return this.prisma.branch_schedules.updateMany({
      where: {
        id_branch,
        day_of_week: dto.day_of_week,
      },
      data,
    });
  }
  

  // Eliminar un día (Desactivar)
  async deactivate(id_branch: number, day: number) {
    return this.prisma.branch_schedules.updateMany({
      where: { id_branch: id_branch, day_of_week: day },
      data: { is_open: false },
    });
  } 

  // Reactivar un día 
  async activate(id_branch: number, day: number) {
    return this.prisma.branch_schedules.updateMany({
      where: { id_branch: id_branch, day_of_week: day },
      data: { is_open: true },
    });
  }
  
  async validateDay(id_branch: number, day_of_week: number) {
    const day = await this.prisma.branch_schedules.findFirst({
      where: { id_branch, day_of_week },
    });

    if (!day) {
      throw new Error(
        `El día ${day_of_week} no existe en la sucursal con id ${id_branch}`,
      );
    }

    return day;
  }


}
