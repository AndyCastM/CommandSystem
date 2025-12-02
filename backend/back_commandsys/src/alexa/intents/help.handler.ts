import { HandlerInput, RequestHandler } from 'ask-sdk-core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HelpIntentHandler implements RequestHandler {
  canHandle(handlerInput: HandlerInput) {
    const req = handlerInput.requestEnvelope.request;

    return req.type === 'IntentRequest' &&
           req.intent?.name === 'AMAZON.HelpIntent';
  }

  handle(handlerInput: HandlerInput) {
    return handlerInput.responseBuilder
      .speak('Puedes decirme cosas como: marca el item uno como listo, o marca el item tres como entregado.')
      .reprompt('¿Qué deseas hacer?')
      .getResponse();
  }
}
