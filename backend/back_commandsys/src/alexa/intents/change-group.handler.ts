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
        .reprompt("¿Quieres intentarlo de nuevo?")
        .withShouldEndSession(false)
        .getResponse();
    }

    const orderId = parseInt(orderIdSlot, 10);
    const groupNumber = parseInt(groupNumberSlot, 10);
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
        .reprompt("¿Quieres intentarlo de nuevo?")
        .withShouldEndSession(false)
        .getResponse();
    }

    const deviceId =
      requestEnvelope.context?.System?.device?.deviceId ?? null;

    if (!deviceId) {
      return handlerInput.responseBuilder
        .speak('No pude identificar el dispositivo de cocina o bar.')
        .reprompt("¿Quieres intentarlo de nuevo?")
        .withShouldEndSession(false)
        .getResponse();
    }

    const deviceConfig = await this.alexaDevicesService.findByDeviceId(deviceId);

    if (!deviceConfig || deviceConfig.is_active !== true) {
      return handlerInput.responseBuilder
        .speak('Este dispositivo no está configurado con un área de producción.')
        .reprompt("¿Quieres intentarlo de nuevo?")
        .withShouldEndSession(false)
        .getResponse();
    }

    const areaId = deviceConfig.id_area;
    const areaName = deviceConfig.print_areas?.name ?? 'el área asignada';

    await this.ordersService.updateGroupStatus(
      orderId,
      groupNumber,
      backendStatus,
      areaId,
    );

    const speakMsg = `Listo. Marqué el grupo ${groupNumber} de la comanda ${orderId} como ${spokenStatus} en ${areaName}.`;

    return handlerInput.responseBuilder
      .speak(speakMsg)
      .reprompt("¿Qué más deseas hacer?")
      .withShouldEndSession(false)
      .getResponse();
  }
}
