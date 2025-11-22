import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AlexaAuthMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const token = req.headers['x-alexa-token'];

    if (!token || token !== process.env.ALEXA_BACKEND_TOKEN) {
      throw new UnauthorizedException('Acceso no autorizado para Alexa');
    }

    next();
  }
}
