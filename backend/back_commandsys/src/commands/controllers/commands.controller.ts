import { Controller, Get, Res } from '@nestjs/common';
import { CommandsService } from '../services/commands.service';
import type { Response } from 'express';

@Controller('commands')
export class CommandsController {
    constructor (private readonly commandsService: CommandsService){}

    @Get('export/excel')
    async exportExcel(@Res() res: Response) {
        const orders = [
        { id: 1, table: 'Mesa 1', product: 'Pizza', quantity: 2, total: 200 },
        { id: 2, table: 'Mesa 2', product: 'Refresco', quantity: 3, total: 90 },
        ]; // Esto normalmente lo traes de la BD

        const buffer = await this.commandsService.exportOrdersExcel(orders);

        res
        .setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .setHeader('Content-Disposition', 'attachment; filename=report.xlsx')
        .send(buffer);
    }

}
