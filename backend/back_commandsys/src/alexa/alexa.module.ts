import { Module } from '@nestjs/common';
import { AlexaController } from './alexa.controller';
import { AlexaSkillFactory } from './alexa-skill.factory';
import { ChangeCommandStatusIntentHandler } from './intents/change-command-status.handler';
import { ChangeItemStatusIntentHandler } from './intents/change-item-status.handler';
import { LaunchRequestHandler } from './intents/launch.handler';
import { FallbackIntentHandler } from './intents/fallback.handler';
import { CancelAndStopIntentHandler } from './intents/cancel-stop.handler';
import { HelpIntentHandler } from './intents/help.handler';
import { SessionEndedRequestHandler } from './intents/session-ended.handler';

import { OrdersModule } from 'src/orders/orders.module';

@Module({
  imports: [OrdersModule], // para poder usar el servicio
  controllers: [AlexaController],
    providers: [
    AlexaSkillFactory,
    LaunchRequestHandler,
    ChangeCommandStatusIntentHandler,
    ChangeItemStatusIntentHandler,
    FallbackIntentHandler,
    CancelAndStopIntentHandler,
    HelpIntentHandler,
    SessionEndedRequestHandler,
    ],
})
export class AlexaModule {}
