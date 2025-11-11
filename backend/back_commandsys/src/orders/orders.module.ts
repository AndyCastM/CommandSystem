import { Module } from '@nestjs/common';
import { OrdersController } from './controllers/orders.controller';
import { OrderItemsController } from './controllers/order-items.controller';
import { OrderItemsService } from './services/order-items.service';
import { OrdersService } from './services/orders.service';

@Module({
  controllers: [OrdersController, OrderItemsController],
  providers: [OrdersService, OrderItemsService],
  exports: [OrdersService, OrderItemsService],
})
export class OrdersModule {}
