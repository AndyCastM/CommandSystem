// src/auth/guards/schedule.guard.ts
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ScheduleGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user; // viene del JwtStrategy
    if (!user) throw new ForbiddenException('Usuario no autenticado');

    // Los superadmin y gerentes siempre pueden entrar
    if (['system_superadmin', 'superadmin', 'gerente'].includes(user.role)) {
      return true;
    }

    // Validar horarios de la sucursal
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Domingo, 6=Sábado

    const schedule = await this.prisma.branch_schedules.findFirst({
      where: {
        id_branch: user.branch,
        day_of_week: dayOfWeek,
        is_open: true,
      },
    });

    if (!schedule) {
      throw new ForbiddenException('La sucursal no tiene horario configurado o está cerrada.');
    }

    // Comparar hora actual con open_time / close_time
    const now = today.toTimeString().slice(0, 8); // "HH:MM:SS"

    // Convert schedule.open_time and schedule.close_time to "HH:MM:SS" strings if they are Date objects
    const openTime =
      schedule.open_time instanceof Date
        ? schedule.open_time.toTimeString().slice(0, 8)
        : schedule.open_time;
    const closeTime =
      schedule.close_time instanceof Date
        ? schedule.close_time.toTimeString().slice(0, 8)
        : schedule.close_time;

    if (now < openTime || now > closeTime) {
      throw new ForbiddenException('Fuera del horario de servicio.');
    }

    return true;
  }
}
