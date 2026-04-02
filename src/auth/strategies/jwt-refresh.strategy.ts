import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import type { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private config: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => req?.cookies?.['refresh_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET') ?? (() => { throw new Error('JWT_REFRESH_SECRET env var is not set'); })(),
      passReqToCallback: true,
    } as any);
  }

  async validate(req: Request, payload: { sub: string; email: string; role: string }) {
    const token = (req as any).cookies?.['refresh_token'];
    if (!token) throw new UnauthorizedException();

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    if (!user.isActive) throw new UnauthorizedException('ACCOUNT_BLOCKED');

    return { ...payload, refreshToken: token };
  }
}
