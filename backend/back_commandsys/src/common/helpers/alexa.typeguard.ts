import { IntentRequest } from 'ask-sdk-model';

export function isIntentRequest(req: any): req is IntentRequest {
  return req?.type === 'IntentRequest' && !!req?.intent;
}
