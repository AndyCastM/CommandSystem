import { Controller, Get, Param, Patch, Body, Post } from '@nestjs/common';
import { OrdersService } from '../services/orders.service';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { formatResponse } from 'src/common/helpers/response.helper';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { order_items_status } from 'generated/prisma';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { CancelItemDto } from '../dto/cancel-item.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.Mesero, Role.Gerente)
  async createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user:any) {
    try {
      const data = await this.ordersService.createOrder(dto, +user.id_branch, +user.sub);
      return formatResponse('Comanda creada correctamente', data.order);
    } catch (error) {
      console.error('Error creando la comanda:', error);
      throw error;
    }
  }

  @Get(':id')
  @Roles(Role.Mesero, Role.Gerente)
  async getOrder(@Param('id') id: string) {
    return this.ordersService.getOrderById(+id);
  }

  @Get('/branch/active')
  @Roles(Role.Mesero, Role.Gerente)
  async getActiveOrders(@CurrentUser() user: any ) {
    return this.ordersService.getActiveOrdersByBranch(+user.id_branch, +user.sub);
  }

  @Patch(':id/status')
  @Roles(Role.Mesero, Role.Gerente)
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateOrderStatus(+id, dto.status);
  }

  @Patch('items/:id/delivered')
  @Roles(Role.Mesero, Role.Gerente)
  async markDelivered(@Param('id') id: string) {
    return this.ordersService.updateItemStatus(Number(id), 'delivered');
  }

  @Patch('items/:id/status')
  @Roles(Role.Mesero, Role.Gerente)
  async updateItemStatus(
    @Param('id') id_order_item: number,
    @Body('status') status: order_items_status,
  ) {
    return this.ordersService.updateItemStatus(+id_order_item, status);
  }

  @Patch('items/:id/cancel')
  @Roles(Role.Mesero, Role.Gerente)
  cancelItem(
    @Param('id') id_order_item: number,
    @Body() dto: CancelItemDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.cancelItem(+id_order_item, dto, +user.sub);
  }

  @Patch(':id/cancel')
  @Roles(Role.Mesero, Role.Gerente)
  cancelOrder(
    @Param('id') id_order: number,
    @Body() dto: CancelItemDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.cancelOrder(+id_order, dto, +user.sub);
  }

}
