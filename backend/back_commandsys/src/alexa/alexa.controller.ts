// alexa.controller.ts
import { Controller, Post, Req, Res } from '@nestjs/common';
import { AlexaSkillFactory } from './alexa-skill.factory';
import { Public} from 'src/auth/decorators/public.decorator';

@Controller('alexa')
export class AlexaController {
  constructor(private readonly skillFactory: AlexaSkillFactory) {}

  @Post()
  @Public()
  async handle(@Req() req, @Res() res) {
    const skill = this.skillFactory.build();
    console.log("REQUEST ALEXA ====>", JSON.stringify(req.body, null, 2));
    const response = await skill.invoke(req.body);
    console.log("RESPUESTA ALEXA ====>", JSON.stringify(response, null, 2));
    return res.status(200).json(response);
  }
}
