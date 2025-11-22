import { HandlerInput, RequestHandler } from 'ask-sdk-core';
import { Injectable } from '@nestjs/common';
import { OrdersService } from 'src/orders/services/orders.service';
import { IntentRequest } from 'ask-sdk-model';

@Injectable()
export class ChangeCommandStatusIntentHandler implements RequestHandler {
  constructor(private readonly orders: OrdersService) {}

  canHandle(handlerInput: HandlerInput) {
    const req = handlerInput.requestEnvelope.request;
    return req.type === 'IntentRequest' &&
           (req as IntentRequest).intent?.name === 'ChangeCommandStatusIntent';
  }

  async handle(handlerInput: HandlerInput) {
    const req = handlerInput.requestEnvelope.request as IntentRequest;

    // Validar slots
    if (!req.intent?.slots) {
      return handlerInput.responseBuilder
        .speak('No pude entender los valores de la comanda o el estado.')
        .getResponse();
    }

    const commandSlot = req.intent.slots['commandId'];
    const statusSlot = req.intent.slots['status'];

    // Validar existencia de cada slot
    if (!commandSlot?.value) {
      return handlerInput.responseBuilder
        .speak('No entendí el número de comanda.')
        .getResponse();
    }

    if (!statusSlot?.value) {
      return handlerInput.responseBuilder
        .speak('No entendí el estado que deseas aplicar.')
        .getResponse();
    }

    const commandId = Number(commandSlot.value);
    const spokenStatus = statusSlot.value.toLowerCase();

    const statusMap = {
      pendiente: 'pending',
      preparando: 'in_progress',
      en_progreso: 'in_progress',
      listo: 'ready',
      entregado: 'delivered',
      cancelado: 'cancelled',
    };

    const mappedStatus = statusMap[spokenStatus];

    if (!mappedStatus) {
      return handlerInput.responseBuilder
        .speak(`El estado ${spokenStatus} no es válido.`)
        .getResponse();
    }

    await this.orders.updateOrderStatus(commandId, mappedStatus);

    return handlerInput.responseBuilder
      .speak(`La comanda ${commandId} fue marcada como ${spokenStatus}.`)
      .getResponse();
  }
}