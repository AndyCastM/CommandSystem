import { Module } from '@nestjs/common';
import { OrdersController } from './controllers/orders.controller';
import { OrderItemsController } from './controllers/order-items.controller';
import { OrderItemsService } from './services/order-items.service';
import { OrdersService } from './services/orders.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { TableSessionsModule } from 'src/table_sessions/table_sessions.module';
import { PrintModule } from 'src/print/print.module';
import { AlexaModule } from 'src/alexa/alexa.module';

@Module({
  imports: [TableSessionsModule, PrintModule, AlexaModule],
  controllers: [OrdersController, OrderItemsController],
  providers: [OrdersService, OrderItemsService, NotificationsGateway],
  exports: [OrdersService, OrderItemsService],
})
export class OrdersModule {}
