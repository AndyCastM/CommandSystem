import { Injectable } from '@nestjs/common';
import { HandlerInput, RequestHandler } from 'ask-sdk-core';
import { OrdersService } from 'src/orders/services/orders.service';
import { AlexaDevicesService } from '../alexa-devices.service';
import { order_items_status } from 'generated/prisma';

@Injectable()
export class ChangeGroupStatusHandler implements RequestHandler {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly alexaDevicesService: AlexaDevicesService,
  ) {}

  canHandle(handlerInput: HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent?.name === 'ChangeGroupStatusIntent';
  }

  async handle(handlerInput: HandlerInput) {
    const { requestEnvelope } = handlerInput;
    const intent = (requestEnvelope.request as any).intent;

    const orderIdSlot = intent.slots?.orderId?.value;
    const groupNumberSlot = intent.slots?.groupNumber?.value;
    const statusSlot = intent.slots?.status;

    if (!orderIdSlot || !groupNumberSlot || !statusSlot?.value) {
      return handlerInput.responseBuilder
        .speak('Necesito el número de comanda, el grupo y el estado.')
        .reprompt('¿Quieres intentarlo de nuevo?')
        .withShouldEndSession(false)
        .getResponse();
    }

    const orderId = Number(orderIdSlot);
    const groupNumber = Number(groupNumberSlot);
    const spokenStatus = statusSlot.value.toLowerCase();

    const statusMap: Record<string, order_items_status> = {
      'pendiente': 'pending',
      'en preparación': 'in_preparation',
      'en preparacion': 'in_preparation',
      'preparando': 'in_preparation',
      'listo': 'ready',
      'entregado': 'delivered',
    };

    const backendStatus = statusMap[spokenStatus];
    if (!backendStatus) {
      return handlerInput.responseBuilder
        .speak(`No entiendo el estado ${spokenStatus}.`)
        .reprompt('¿Quieres intentarlo de nuevo?')
        .withShouldEndSession(false)
        .getResponse();
    }

    // ========= VALIDACIÓN DEL DISPOSITIVO =========
    const deviceId = requestEnvelope.context?.System?.device?.deviceId ?? null;
    if (!deviceId) {
      return handlerInput.responseBuilder
        .speak('No pude identificar el dispositivo de cocina o bar.')
        .reprompt('¿Quieres intentarlo de nuevo?')
        .withShouldEndSession(false)
        .getResponse();
    }

    const deviceConfig = await this.alexaDevicesService.findByDeviceId(deviceId);

    if (!deviceConfig || deviceConfig.is_active !== true) {
      return handlerInput.responseBuilder
        .speak('Este dispositivo no está configurado con un área de producción.')
        .reprompt('¿Quieres intentarlo de nuevo?')
        .withShouldEndSession(false)
        .getResponse();
    }

    const areaId = deviceConfig.id_area;
    const areaName = deviceConfig.print_areas?.name ?? 'el área asignada';

    // ========= OBTENER ITEMS DEL GRUPO =========
    const items = await this.ordersService.getItemsByGroup(
      orderId,
      groupNumber,
      areaId,
      true // incluir cancelados
    );

    if (!items || items.length === 0) {
      return handlerInput.responseBuilder
        .speak(`No encontré el grupo ${groupNumber} en la comanda ${orderId}.`)
        .reprompt('¿Qué más deseas hacer?')
        .withShouldEndSession(false)
        .getResponse();
    }

    const cancelled = items.filter(i => i.status === 'cancelled');
    const active = items.filter(i => i.status !== 'cancelled');

    if (active.length === 0) {
      return handlerInput.responseBuilder
        .speak(
          `El grupo ${groupNumber} de la comanda ${orderId} está completamente cancelado. No hay nada que actualizar.`
        )
        .reprompt('¿Qué más deseas hacer?')
        .withShouldEndSession(false)
        .getResponse();
    }

    // ========= ACTUALIZAR SOLO ACTIVOS =========
    await this.ordersService.updateGroupStatus(
      orderId,
      groupNumber,
      backendStatus,
      areaId,
    );

    // ========= ARMAR MENSAJE DETALLADO =========
    let speakMsg =
      `Listo. Actualicé el grupo ${groupNumber} de la comanda ${orderId} a ${spokenStatus} en ${areaName}.`;

    if (cancelled.length > 0) {
      const formatted = cancelled
        .map(i => `${i.quantity} ${i.branch_products?.company_products?.name ?? 'producto'}`)
        .join(', ');

      speakMsg += ` Se omitieron ${cancelled.length} productos cancelados: ${formatted}.`;
    }

    return handlerInput.responseBuilder
      .speak(speakMsg)
      .reprompt('¿Qué más deseas hacer?')
      .withShouldEndSession(false)
      .getResponse();
  }
}
