import { order_items_status } from 'generated/prisma';
import { IsEnum } from 'class-validator';

export class UpdateOrderItemStatusDto {
  @IsEnum(order_items_status)
  status: order_items_status;
}
