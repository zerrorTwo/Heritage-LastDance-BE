import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './service';
import { SignUpDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SignInDto } from './dto/signin.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyForgotPasswordDto } from './dto/verify-forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GoogleOAuthGuard } from '../../common/guards/google-oauth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import type { GoogleProfile } from '../../common/strategies/google.strategy';

/**
 * AuthController
 *
 * Responsibilities (ONLY):
 *  1. Bind and validate request data via DTOs (handled by ValidationPipe)
 *  2. Extract request metadata (ip, user-agent, authenticated user)
 *  3. Call AuthService with structured data
 *  4. Return the service result — no business logic here
 *
 * All error handling is delegated to GlobalExceptionFilter.
 */
@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /auth/signup ──────────────────────────────────────────────────────

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new account — sends OTP to email' })
  @ApiResponse({ status: 201, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 429, description: 'Too many OTP requests' })
  signUp(@Body() dto: SignUpDto, @Req() req: Request) {
    const ip = this.extractIp(req);
    return this.authService.signUp(dto, ip);
  }

  // ── POST /auth/verify-otp ──────────────────────────────────────────────────

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify signup OTP — creates user account' })
  @ApiResponse({
    status: 200,
    description: 'Account created, returns verifyToken',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 404, description: 'Challenge not found or expired' })
  @ApiResponse({ status: 429, description: 'Too many failed OTP attempts' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // ── POST /auth/signin ──────────────────────────────────────────────────────

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Returns access token and refresh token',
  })
  @ApiResponse({ status: 400, description: 'Invalid email or password' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  signIn(@Body() dto: SignInDto, @Req() req: Request) {
    const ip = this.extractIp(req);
    const deviceInfo = (req.headers['user-agent'] ?? null) as string | null;
    return this.authService.signIn(dto, ip, deviceInfo);
  }

  // ── POST /auth/refresh ─────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue a new access token using a refresh token' })
  @ApiResponse({ status: 200, description: 'Returns new access token' })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired' })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  // ── POST /auth/logout ──────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke current session (logout)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.sessionId);
  }

  // ── POST /auth/forgot-password ─────────────────────────────────────────────

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset OTP (anti-enumeration)' })
  @ApiResponse({
    status: 200,
    description: 'Same response whether email exists or not',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // ── POST /auth/forgot-password/verify ─────────────────────────────────────

  @Public()
  @Post('forgot-password/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify forgot-password OTP — returns reset token' })
  @ApiResponse({ status: 200, description: 'OTP valid, returns resetToken' })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  @ApiResponse({ status: 404, description: 'Challenge not found or expired' })
  @ApiResponse({ status: 429, description: 'Too many failed attempts' })
  verifyForgotPassword(@Body() dto: VerifyForgotPasswordDto) {
    return this.authService.verifyForgotPassword(dto);
  }

  // ── POST /auth/change-password ─────────────────────────────────────────────

  @Public()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password using reset token' })
  @ApiResponse({
    status: 200,
    description: 'Password changed, all sessions revoked',
  })
  @ApiResponse({ status: 400, description: 'Reset token invalid or expired' })
  changePassword(@Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(dto);
  }

  // ── GET /auth/google ───────────────────────────────────────────────────────

  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth2 flow' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Google consent screen',
  })
  googleAuth() {
    // GoogleOAuthGuard handles the redirect automatically
  }

  // ── GET /auth/google/callback ──────────────────────────────────────────────

  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get('google/callback')
  @ApiOperation({
    summary: 'Google OAuth callback — redirect to frontend with tokens',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to frontend callback URL',
  })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = (req as Request & { user: GoogleProfile }).user;
    const ip = this.extractIp(req);
    const result = await this.authService.googleLogin(profile, ip);
    return res.redirect(result.redirectUrl);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private extractIp(req: Request): string {
    return (req.ip ?? req.socket?.remoteAddress ?? '127.0.0.1').replace(
      '::ffff:',
      '',
    );
  }
}
