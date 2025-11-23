import { Controller, Get, Query, Req, BadRequestException } from '@nestjs/common';
import { MetricsService } from '../services/metrics.service';
import { GetDashboardDto } from '../dto/get-dashboard.dto';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('dashboard')
  async getDashboard(@Query() dto: GetDashboardDto, @Req() req) {
    let id_branch = req.user.id_branch;

    // Si es admin corporativo: ve todas las sucursales
    if (req.user.role === 'Admin' || req.user.role === 'Superadmin') {
      id_branch = null; // null = todas
    }

    return this.metricsService.getDashboard(dto, id_branch);
  }
}
