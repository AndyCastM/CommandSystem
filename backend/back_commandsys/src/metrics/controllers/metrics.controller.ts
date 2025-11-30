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
  @Roles(Role.Admin, Role.Gerente)
  async getDashboard(@Query() dto: GetDashboardDto, @Req() req) {
    const user = req.user;
    const id_company = user.id_company;

    let id_branch: number | null = null;

    // Si es GERENTE: siempre su propia sucursal
    if (user.role === 'Gerente') {
      id_branch = user.id_branch; // obligado a su sucursal
    }

    // Si es ADMIN 
    //  - si manda id_branch se usa esa
    //  - si no manda nada muestra todas
    if (user.role === 'Admin') {
      if (dto.id_branch) {
        id_branch = Number(dto.id_branch); // una sucursal específica
      } else {
        id_branch = null; // todas las sucursales de la empresa
      }
    }

    return this.metricsService.getDashboard(dto, id_branch, id_company);
  }


  @Get('top-products')
  @Roles(Role.Superadmin, Role.Admin, Role.Gerente)
  async getTopProducts(
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: any,
    @Query('id_branch') idBranchParam?: string,
  ) {
    let id_branch: number | null = null;

    // GERENTE: siempre su sucursal, ignorar lo que venga en query
    if (user.role === 'Gerente') {
      id_branch = user.id_branch;
    }

    // ADMIN
    //  - si viene id_branch  usar esa
    //  - si no viene mostrar todas
    if (user.role === 'Admin') {
      if (idBranchParam) {
        id_branch = Number(idBranchParam);
      } else {
        id_branch = null;
      }
    }

    return this.metricsService.getTopProducts(
      from,
      to,
      id_branch,
      Number(user.id_company),
    );
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
