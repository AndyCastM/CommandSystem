import { HandlerInput, RequestHandler } from 'ask-sdk-core';
import { Injectable } from '@nestjs/common';
import { IntentRequest } from 'ask-sdk-model';
import { OrdersService } from 'src/orders/services/orders.service';

@Injectable()
export class ChangeItemStatusIntentHandler implements RequestHandler {
  constructor(private readonly orders: OrdersService) {}

  canHandle(handlerInput: HandlerInput) {
    const req = handlerInput.requestEnvelope.request;
    return req.type === 'IntentRequest' &&
           (req as IntentRequest).intent?.name === 'ChangeItemStatusIntent';
  }

  async handle(handlerInput: HandlerInput) {
    const req = handlerInput.requestEnvelope.request as IntentRequest;

    if (!req.intent?.slots) {
      return handlerInput.responseBuilder
        .speak('No pude entender los valores del ítem o del estado.')
        .reprompt("¿Quieres intentarlo de nuevo?")
        .withShouldEndSession(false)
        .getResponse();
    }

    const itemSlot = req.intent.slots['itemId'];
    const statusSlot = req.intent.slots['status'] ?? req.intent.slots['orderStatus'];

    if (!itemSlot?.value) {
      return handlerInput.responseBuilder
        .speak('No entendí el número de ítem.')
        .reprompt("¿Quieres intentarlo de nuevo?")
        .withShouldEndSession(false)
        .getResponse();
    }

    if (!statusSlot?.value) {
      return handlerInput.responseBuilder
        .speak('No entendí el estado que deseas aplicar.')
        .reprompt("¿Quieres intentarlo de nuevo?")
        .withShouldEndSession(false)
        .getResponse();
    }

    const itemId = Number(itemSlot.value);
    const spokenStatus = statusSlot.value.toLowerCase();

    const statusMap = {
      pendiente: 'pending',
      preparando: 'in_preparation',
      en_preparacion: 'in_preparation',
      listo: 'ready',
      entregado: 'delivered',
    };

    const mappedStatus = statusMap[spokenStatus];

    if (!mappedStatus) {
      return handlerInput.responseBuilder
        .speak(`El estado ${spokenStatus} no es válido para ítems.`)
        .getResponse();
    }

    await this.orders.updateItemStatus(itemId, mappedStatus);

    return handlerInput.responseBuilder
      .speak(`El ítem ${itemId} fue marcado como ${spokenStatus}.`)
      .reprompt("¿Qué más deseas hacer?")
      .withShouldEndSession(false)
      .getResponse();
  }
}
