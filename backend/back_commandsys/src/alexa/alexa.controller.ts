import { Controller, Post, Req, Res, Body, Get } from '@nestjs/common';
import { AlexaSkillFactory } from './alexa-skill.factory';
import { Public} from 'src/auth/decorators/public.decorator';
import { AlexaDevicesService } from './alexa-devices.service';

@Controller('alexa')
export class AlexaController {
  constructor(private readonly skillFactory: AlexaSkillFactory, private readonly service: AlexaDevicesService) {}

  @Post()
  @Public()
  async handle(@Req() req, @Res() res) {
    const skill = this.skillFactory.build();
    console.log("REQUEST ALEXA ====>", JSON.stringify(req.body, null, 2));
    const response = await skill.invoke(req.body);
    console.log("RESPUESTA ALEXA ====>", JSON.stringify(response, null, 2));
    return res.status(200).json(response);
  }

  @Post('register')
  async register(@Body() body: any) {
    const { device_id, id_area, id_branch, name } = body;

    if (!device_id || !id_area) {
      return { error: 'device_id y id_area son obligatorios' };
    }

    const saved = await this.service.registerDevice(device_id, id_area, id_branch, name);

    return {
      message: 'Alexa registrado correctamente',
      device: saved,
    };
  }

  @Get()
  async list() {
    return this.service.getAll();
  }
}
