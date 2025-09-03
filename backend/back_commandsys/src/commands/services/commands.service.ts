import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';

@Injectable()
export class CommandsService {

    async exportOrdersExcel(orders: any[]): Promise<Buffer> {
        const workbook = new Workbook();
        const sheet = workbook.addWorksheet('Comandas');

        // Encabezados
        sheet.addRow(['ID', 'Mesa', 'Producto', 'Cantidad', 'Total']);

        //Datos
        orders.forEach(order => {
            sheet.addRow([order.id, order.table, order.product, order.quantity, order.total]);
        });

        // Generar buffer para el cliente
        const arrayBuffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(arrayBuffer);
    }

}
