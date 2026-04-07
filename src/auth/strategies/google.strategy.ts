import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

const PLACEHOLDER = 'your_google_client_id_here';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private static readonly logger = new Logger('GoogleStrategy');

  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const clientID     = config.get<string>('GOOGLE_CLIENT_ID', '');
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET', '');
    const callbackURL  = config.get<string>('GOOGLE_CALLBACK_URL', 'http://localhost:3001/api/auth/google/callback');

    if (!clientID || clientID === PLACEHOLDER || !clientSecret) {
      GoogleStrategy.logger.warn(
        'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET nu sunt configurate. ' +
        'Autentificarea cu Google este dezactivată.',
      );
      // Pass dummy values — Passport won't make any requests until the
      // /auth/google endpoint is actually called, so the app starts fine.
      super({ clientID: 'disabled', clientSecret: 'disabled', callbackURL, scope: ['email', 'profile'] });
      return;
    }

    super({ clientID, clientSecret, callbackURL, scope: ['email', 'profile'] });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) throw new Error('Google account has no email address');

    return this.usersService.findOrCreateGoogleUser({
      googleId: profile.id,
      email,
      name:   profile.displayName,
      avatar: profile.photos?.[0]?.value,
    });
  }
}
