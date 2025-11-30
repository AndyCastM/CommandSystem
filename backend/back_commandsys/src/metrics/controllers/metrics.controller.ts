import { Controller, Get, Query, Req, BadRequestException, Res, Header, StreamableFile } from '@nestjs/common';
import { MetricsService } from '../services/metrics.service';
import { GetDashboardDto } from '../dto/get-dashboard.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { MetricsExportService } from '../services/metrics-export.service';
import { GetCancellationsDto } from '../dto/get-cancellations.dto';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService, private readonly exportService: MetricsExportService) {}

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

  @Get('cancellations')
  async getCancellations(@Query() dto: GetCancellationsDto, @CurrentUser() user: any) {
    return this.metricsService.getCancellationsLog(dto, +user.id_branch, +user.id_company);
  }

  @Get('export/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header(
    'Content-Disposition',
    'attachment; filename="metrics-report.pdf"'
  )
  async exportPdf(
    @Query() dto: GetDashboardDto, @CurrentUser() user: any
  ): Promise<StreamableFile> {
    const buffer = await this.exportService.exportPDF(dto, +user.id_branch, +user.id_company);
    return new StreamableFile(buffer);
  }

  @Get('export/excel')
  async downloadExcel(@Query() dto: GetDashboardDto, @CurrentUser() user: any, @Res() res) {
    const buffer = await this.metricsService.exportExcel(dto, +user.id_branch, +user.id_company);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=metricas.xlsx',
    });

    res.send(buffer);
  }

}
