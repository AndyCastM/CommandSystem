// src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

function cookieExtractor(req: any): string | null {
  if (req && req.cookies && req.cookies['access_token']) {
    return req.cookies['access_token'];
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]), // se lee el access_token de la cookie
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  // payload viene del token: 
  async validate(payload: any) {
    // Lo que retorne validate se guarda en req.user
    return payload; 
  }
}
