import { Controller, Get, Param, Patch, Body, Post, BadRequestException, Req } from '@nestjs/common';
import { OrdersService } from '../services/orders.service';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { formatResponse } from 'src/common/helpers/response.helper';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { order_items_status } from 'generated/prisma';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { CancelItemDto } from '../dto/cancel-item.dto';
import { AlexaDevicesService } from 'src/alexa/alexa-devices.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService, private readonly alexaDevicesService: AlexaDevicesService) {}

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

  @Post('item/:id/split')
  @Roles(Role.Mesero, Role.Gerente)
  splitItem(
    @Param('id') id_order_item: number,
    @Body('qty') qty: number,
  ) {
    return this.ordersService.splitItem(+id_order_item, qty);
  }
  
  @Post('request-prebill/:id_session')
  async requestPrebill(@Param('id_session') id_session: number, @CurrentUser() user: any) {
    const order = await this.ordersService.requestPrebill(+id_session, +user.sub);
    return { ok: true };
  }

  @Post('takeout-prebill/:id_order')
  async requestTakeoutPrebill(
    @Param('id_order') id_order: number,
    @CurrentUser() user: any
  ) {
    return this.ordersService.requestTakeoutPrebill(+id_order, +user.sub);
  }

  @Get('summary/:id_session')
  async getSessionSummary(@Param('id_session') id_session: number, @CurrentUser() user: any) {
    return this.ordersService.getSessionSummary(+id_session);
  }

  @Patch(':id_order/groups/:group_number/status')
  async updateGroupStatus(
    @Param('id_order') id_order: string,
    @Param('group_number') group_number: string,
    @Body('status') status: order_items_status,
    @Req() req,
  ) {
    const validStatuses: order_items_status[] = [
      'pending',
      'in_preparation',
      'ready',
      'delivered',
    ];

    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Estado de grupo inválido');
    }

    // Alexa manda el deviceId en req.headers['alexa-device-id']
    const deviceId = req.headers['alexa-device-id'];

    if (!deviceId) {
      throw new BadRequestException(
        'Falta el deviceId de Alexa para determinar el área.',
      );
    }

    // Buscar área configurada para este Alexa
    const device = await this.alexaDevicesService.findByDeviceId(deviceId);

    if (!device) {
      throw new BadRequestException('Este Alexa no está ligado a ningún área.');
    }

    const id_area = device.id_area;

    const result = await this.ordersService.updateGroupStatus(
      Number(id_order),
      Number(group_number),
      status,
      id_area,
    );

    return {
      message: `Grupo ${group_number} actualizado a ${status} desde Alexa (${device.print_areas.name})`,
      updated_count: result.count,
    };
  }

}
