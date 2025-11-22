import { HandlerInput, RequestHandler } from 'ask-sdk-core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FallbackIntentHandler implements RequestHandler {
  canHandle(handlerInput: HandlerInput) {
    const req = handlerInput.requestEnvelope.request;

    return req.type === 'IntentRequest' &&
           req.intent?.name === 'AMAZON.FallbackIntent';
  }

  handle(handlerInput: HandlerInput) {
    return handlerInput.responseBuilder
      .speak('No entendí eso. Puedes decir cosas como: marca la comanda uno como listo.')
      .reprompt('¿Qué deseas hacer?')
      .getResponse();
  }
}
