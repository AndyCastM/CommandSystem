import { Injectable } from '@nestjs/common';
import { SkillBuilders } from 'ask-sdk-core';

import { LaunchRequestHandler } from './intents/launch.handler';
import { HelloWorldIntentHandler } from './intents/hello-world.handler';
import { HelpIntentHandler } from './intents/help.handler';
import { CancelAndStopIntentHandler } from './intents/cancel-stop.handler';
import { FallbackIntentHandler } from './intents/fallback.handler';
import { ChangeCommandStatusIntentHandler } from './intents/change-command-status.handler';
import { ChangeItemStatusIntentHandler } from './intents/change-item-status.handler';
import { SessionEndedRequestHandler } from './intents/session-ended.handler';
import { ChangeGroupStatusHandler } from './intents/change-group.handler';

@Injectable()
export class AlexaSkillFactory {
  constructor(
    private readonly launchHandler: LaunchRequestHandler,
    private readonly helloworldHandler: HelloWorldIntentHandler,
    private readonly helpHandler: HelpIntentHandler,
    private readonly cancelStopHandler: CancelAndStopIntentHandler,
    private readonly fallbackHandler: FallbackIntentHandler,
    private readonly changeOrder: ChangeCommandStatusIntentHandler,
    private readonly changeItem: ChangeItemStatusIntentHandler,
    private readonly changeGroupStatus: ChangeGroupStatusHandler,
    private readonly sessionEnded: SessionEndedRequestHandler,
  ) {}

  build() {
    return SkillBuilders.custom()
      .addRequestHandlers(
        this.launchHandler,
        this.helloworldHandler,
        this.changeOrder,
        this.changeItem,
        this.changeGroupStatus,
        this.helpHandler,
        this.cancelStopHandler,
        this.fallbackHandler,
        this.sessionEnded,
      )
      .create();
  }
}
