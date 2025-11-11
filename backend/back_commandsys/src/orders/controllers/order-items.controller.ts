import { Controller, Patch, Param, Body } from '@nestjs/common';
import { OrderItemsService } from '../services/order-items.service';
import { UpdateOrderItemStatusDto } from '../dto/update-order-item-status.dto';

@Controller('order-items')
export class OrderItemsController {
  constructor(private readonly orderItemsService: OrderItemsService) {}

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderItemStatusDto) {
    return this.orderItemsService.updateItemStatus(+id, dto.status);
  }
}
