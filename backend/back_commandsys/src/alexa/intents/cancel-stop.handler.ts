import { HandlerInput, RequestHandler } from 'ask-sdk-core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CancelAndStopIntentHandler implements RequestHandler {
  canHandle(handlerInput: HandlerInput) {
    const req = handlerInput.requestEnvelope.request;

    return req.type === 'IntentRequest' &&
      (req.intent?.name === 'AMAZON.CancelIntent' ||
       req.intent?.name === 'AMAZON.StopIntent');
  }

  handle(handlerInput: HandlerInput) {
    return handlerInput.responseBuilder
      .speak('Hasta luego.')
      .getResponse();
  }
}
