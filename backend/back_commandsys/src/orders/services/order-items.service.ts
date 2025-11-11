import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { order_items_status } from 'generated/prisma';

@Injectable()
export class OrderItemsService {
  constructor(private prisma: PrismaService) {}

  
  async updateItemStatus(id_order_item: number, status: order_items_status) {
    const validStatuses = ['pending', 'in_preparation', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Estado inválido');
    }

    const item = await this.prisma.order_items.update({
      where: { id_order_item },
      data: { status },
    });

    // Si todos los items están listos, actualiza la orden principal
    const pendingItems = await this.prisma.order_items.count({
      where: { id_order: item.id_order, status: { notIn: ['ready', 'delivered', 'cancelled'] } },
    });

    if (pendingItems === 0) {
      await this.prisma.orders.update({
        where: { id_order: item.id_order },
        data: { status: 'ready' },
      });
    }

    return { message: `Platillo actualizado a ${status}`, item };
  }
}
