import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private config: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? (() => { throw new Error('JWT_ACCESS_SECRET env var is not set'); })(),
    } as any);
  }

  async validate(payload: { sub: string; email: string; role: string; tokenVersion?: number }) {
    const user = await this.usersService.findByIdForAuth(payload.sub);
    if (!user) throw new UnauthorizedException();
    if (!user.isActive) throw new UnauthorizedException('ACCOUNT_BLOCKED');
    // Invalidate access tokens issued before the last logout (token rotation)
    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Token invalidat. Te rugăm să te autentifici din nou.');
    }
    return user;
  }
}
