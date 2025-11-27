import { HandlerInput, RequestHandler } from 'ask-sdk-core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HelloWorldIntentHandler implements RequestHandler {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
           handlerInput.requestEnvelope.request.intent.name === 'HelloWorldIntent';
  }

  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("Hola, ¿qué deseas hacer en el sistema de comandas?")
      .reprompt("¿Qué deseas hacer?")
      .getResponse();
  }
}
