import { HandlerInput, RequestHandler } from 'ask-sdk-core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionEndedRequestHandler implements RequestHandler {
  canHandle(handlerInput: HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  }

  handle(handlerInput: HandlerInput) {
    return handlerInput.responseBuilder.getResponse();
  }
}
