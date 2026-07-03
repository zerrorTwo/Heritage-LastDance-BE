import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import loadEnv from '../../config/configuration';

const env = loadEnv();
const googleClientId = (env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || 'google-oauth-disabled') as string;
const googleClientSecret = (env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || 'google-oauth-disabled') as string;
const googleCallbackUrl = (env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback') as string;

export interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
}

/**
 * Google OAuth2 Passport strategy.
 * Reads credentials from YAML config.
 * Returns a normalized GoogleProfile used by AuthService.googleLogin().
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: googleCallbackUrl,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const { id, name, emails, photos } = profile;
    const googleProfile: GoogleProfile = {
      googleId: id,
      email: emails?.[0]?.value ?? '',
      firstName: name?.givenName ?? '',
      lastName: name?.familyName ?? '',
      avatar: photos?.[0]?.value ?? null,
    };
    done(null, googleProfile);
  }
}
