import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../decorators/current-user.decorator';
import loadEnv from '../../config/configuration';

const env = loadEnv();
const jwtSecret = (env.JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-key') as string;

/**
 * Passport JWT strategy.
 * Extracts Bearer token from Authorization header,
 * verifies signature, and populates req.user with payload.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          return req?.cookies?.accessToken ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    // Called after token is verified. Return value is set as req.user.
    return {
      sub: payload.sub,
      email: payload.email,
      sessionId: payload.sessionId,
    };
  }
}
