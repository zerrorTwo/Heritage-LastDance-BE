import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for Google OAuth2 flow.
 * Use on GET /auth/google and GET /auth/google/callback.
 */
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {}
