import { Module } from '@nestjs/common';
import { PrintService } from './services/print.service';
import { PrintController } from './controllers/print.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrintGateway } from './print.gateway';
import { OrdersService } from 'src/orders/services/orders.service';
import { OrdersModule } from 'src/orders/orders.module';

@Module({
  controllers: [PrintController],
  providers: [PrintService, PrismaService, PrintGateway],
  exports: [PrintService],
})
export class PrintModule {}
