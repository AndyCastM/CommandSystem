import { Module, forwardRef } from '@nestjs/common';
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
import { HelloWorldIntentHandler } from './intents/hello-world.handler';
import { ChangeGroupStatusHandler } from './intents/change-group.handler';
import { AlexaDevicesService } from './alexa-devices.service';
import { AlexaDevicesModule } from './alexa-devices.module';

@Module({
  imports: [AlexaDevicesModule, forwardRef(() => OrdersModule)],
  controllers: [AlexaController],
    providers: [
    AlexaSkillFactory,
    AlexaDevicesService,
    LaunchRequestHandler,
    HelloWorldIntentHandler,
    ChangeCommandStatusIntentHandler,
    ChangeItemStatusIntentHandler,
    ChangeGroupStatusHandler,
    FallbackIntentHandler,
    CancelAndStopIntentHandler,
    HelpIntentHandler,
    SessionEndedRequestHandler,
    ],
  exports:[AlexaDevicesService],
})
export class AlexaModule {}
