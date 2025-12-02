import { HandlerInput, RequestHandler } from 'ask-sdk-core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LaunchRequestHandler implements RequestHandler {
  canHandle(handlerInput: HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest';
  }

  handle(handlerInput: HandlerInput) {
    const speechText = 'Bienvenido al sistema de comandas. Puedes decir cosas como: marca el item uno como listo.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt('¿Qué deseas hacer?')
      .getResponse();
  }
}
