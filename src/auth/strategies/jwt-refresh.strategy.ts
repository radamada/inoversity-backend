import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => req?.cookies?.['refresh_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET') ?? 'default_refresh_secret',
      passReqToCallback: true,
    } as any);
  }

  async validate(req: Request, payload: { sub: string; email: string; role: string }) {
    const token = (req as any).cookies?.['refresh_token'];
    if (!token) throw new UnauthorizedException();
    return { ...payload, refreshToken: token };
  }
}
