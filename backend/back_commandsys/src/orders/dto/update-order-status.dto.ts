import { orders_status } from 'generated/prisma';
import { IsEnum } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsEnum(orders_status)
  status: orders_status;
}
