import { Controller, Get, Param, Patch, Body, Post } from '@nestjs/common';
import { OrdersService } from '../services/orders.service';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { formatResponse } from 'src/common/helpers/response.helper';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user:any) {
    try {
      const data = await this.ordersService.createOrder(dto, +user.id_branch, +user.id_user);
      return formatResponse('Comanda creada correctamente', data.order);
    } catch (error) {
      console.error('Error creando la comanda:', error);
      throw error;
    }
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return this.ordersService.getOrderById(+id);
  }

  @Get('/branch/active')
  async getActiveOrders(@CurrentUser() user: any ) {
    return this.ordersService.getActiveOrdersByBranch(+user.id_branch);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateOrderStatus(+id, dto.status);
  }
}
