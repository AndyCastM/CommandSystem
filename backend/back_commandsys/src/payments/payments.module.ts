import { Module } from '@nestjs/common';
import { PaymentsService } from './services/payments.service';
import { PaymentsController } from './controllers/payments.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService],
})
export class PaymentsModule {}
