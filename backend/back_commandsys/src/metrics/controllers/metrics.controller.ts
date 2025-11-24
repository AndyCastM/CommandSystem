import { Controller, Get, Query, Req, BadRequestException } from '@nestjs/common';
import { MetricsService } from '../services/metrics.service';
import { GetDashboardDto } from '../dto/get-dashboard.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('dashboard')
  @Roles(Role.Superadmin, Role.Admin, Role.Gerente)
  async getDashboard(@Query() dto: GetDashboardDto, @Req() req) {
    let id_branch = req.user.id_branch;
    let id_company = req.user.id_company;
    // Si es admin corporativo: ve todas las sucursales
    if (req.user.role === 'Admin' || req.user.role === 'Superadmin') {
      id_branch = null; // null = todas
    }

    return this.metricsService.getDashboard(dto, id_branch, id_company);
  }

  @Get('top-products')
  @Roles(Role.Superadmin, Role.Admin, Role.Gerente)
  async getTopProducts(
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: any,
  ) {
    let id_branch: number | null = user.role === 'Admin' ? null : user.id_branch;
    return this.metricsService.getTopProducts(from, to, id_branch, +user.id_company);
  }

}
