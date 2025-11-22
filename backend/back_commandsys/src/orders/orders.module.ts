import { Module } from '@nestjs/common';
import { OrdersController } from './controllers/orders.controller';
import { OrderItemsController } from './controllers/order-items.controller';
import { OrderItemsService } from './services/order-items.service';
import { OrdersService } from './services/orders.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

@Module({
  controllers: [OrdersController, OrderItemsController],
  providers: [OrdersService, OrderItemsService, NotificationsGateway],
  exports: [OrdersService, OrderItemsService],
})
export class OrdersModule {}
