import { Controller, Post, Body , Param, Get, Patch} from '@nestjs/common';
import { PrintService } from '../services/print.service';
import { UpsertPrinterDto } from '../dto/upsert-printer.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('print')
export class PrintController {
  constructor(private service: PrintService,) {}

  @Post('test')
  async testPrint(@Body() body: { ip: string }) {
    return this.service.test();
  }

  @Get('stations')
  async listStations(@CurrentUser() user : any) {
    return this.service.listPrintersByBranch(+user.id_branch);
  }
  // POST /print/stations  → crear/actualizar impresora lógica con sus áreas
  @Post('stations')
  async upsertStation(@Body() dto: UpsertPrinterDto, @CurrentUser() user : any) {
    return this.service.upsertPrinter(+user.id_branch, dto);
  }

  @Patch('stations/:id/disable')
  async disable(@Param('id') id: number) {
    return this.service.disablePrinter(+id);
  }

  @Patch('stations/activate-many')
  activateMany(@Body('ids') ids: number[]) {
    return this.service.setActiveStatus(ids, 1);
  }

  @Patch('stations/disable-many')
  disableMany(@Body('ids') ids: number[]) {
    return this.service.setActiveStatus(ids, 0);
  }

}
