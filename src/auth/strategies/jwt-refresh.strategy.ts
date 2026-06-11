import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import type { Request } from 'express';
import { COOKIE_NAMES } from '../cookie-names.const';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private config: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => req?.cookies?.[COOKIE_NAMES.refreshToken] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET') ?? (() => { throw new Error('JWT_REFRESH_SECRET env var is not set'); })(),
      algorithms: ['HS256'],
      passReqToCallback: true,
    } as any);
  }

  async validate(req: Request, payload: { sub: string; email: string; role: string; tokenVersion?: number }) {
    const token = (req as any).cookies?.[COOKIE_NAMES.refreshToken];
    if (!token) throw new UnauthorizedException();

    const user = await this.usersService.findByIdForAuth(payload.sub);
    if (!user) throw new UnauthorizedException();
    if (!user.isActive) throw new UnauthorizedException('ACCOUNT_BLOCKED');

    // Invalidate tokens issued before the last logout
    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Token invalidat. Te rugăm să te autentifici din nou.');
    }

    return { ...payload, refreshToken: token };
  }
}
