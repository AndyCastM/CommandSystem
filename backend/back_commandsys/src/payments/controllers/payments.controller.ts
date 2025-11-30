import { Controller, Post, Body, Req, Get, Query , Param} from '@nestjs/common';
import { PaymentsService } from '../services/payments.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post()
  @Roles(Role.Cajero)
  create(@CurrentUser() user: any, @Body() dto) {
    return this.payments.createPayment(dto, +user.sub, +user.id_branch);
  }

  @Get('by-cash')
  @Roles(Role.Cajero)
  getByCash(@Query('id') id: number) {
    return this.payments.getPaymentsByCashSession(Number(id));
  }

  @Get('order/:id_order')
  @Roles(Role.Cajero, Role.Mesero, Role.Gerente)
  getOrderDetails(@Param('id_order') id_order: number) {
    return this.payments.getOrderDetail(+id_order);
  }

  @Get('pending-prebills')
  async getPendingPrebills(@CurrentUser() user: any) {
    return this.payments.getPendingPrebills(+user.id_branch);
  }
}
