import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import {
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { AuthService } from './service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { VerifyOtpDto, ResendOtpDto } from './dto/verify-otp.dto';
import {
  ForgotPasswordDto,
  VerifyForgotPasswordOtpDto,
  ResetPasswordDto,
} from './dto/forgot-password.dto';
import { ChangePasswordDto, RefreshTokenDto } from './dto/change-password.dto';
import { Response, GeneralResponse } from '../../common/response';
import {
  UserProfileDto,
  AuthResponseDto,
  OtpVerifyResponseDto,
  ForgotPasswordResponseDto,
  RefreshTokenResponseDto,
  GoogleLoginResponseDto,
  LogoutResponseDto,
} from './dto/response';

@ApiExtraModels(
  GeneralResponse,
  AuthResponseDto,
  OtpVerifyResponseDto,
  ForgotPasswordResponseDto,
  RefreshTokenResponseDto,
  GoogleLoginResponseDto,
  LogoutResponseDto,
  UserProfileDto,
)
@Controller('auth')
@ApiTags('Authentication')
@ApiBearerAuth('access-token')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register new user', description: 'Register with email and password. Sends OTP to email.' })
  @ApiBody({ type: SignUpDto })
  @ApiResponse({
    status: 201,
    description: 'Returns auth token for OTP verification',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(OtpVerifyResponseDto) } } },
      ],
    },
  })
  async signUp(@Body() dto: SignUpDto) {
    const authToken = await this.authService.signUp(dto.email, dto.password);
    return Response.Created({ authToken });
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email', description: 'Sign in with email and password. Returns JWT tokens.' })
  @ApiBody({ type: SignInDto })
  @ApiResponse({
    status: 200,
    description: 'Returns access token, refresh token, session ID, and user info',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(AuthResponseDto) } } },
      ],
    },
  })
  async signIn(@Body() dto: SignInDto, @Req() req: any) {
    const result = await this.authService.signIn(
      dto.email,
      dto.password,
      req.ip,
      req.headers['user-agent'],
    );
    return Response.OK(result);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP', description: 'Verify OTP code and complete signup. Returns JWT tokens.' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Returns access token, refresh token, session ID, and user info',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(AuthResponseDto) } } },
      ],
    },
  })
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: any) {
    const result = await this.authService.verifyOTP(
      dto.token,
      dto.otpCode,
      req.ip,
      req.headers['user-agent'],
    );
    return Response.OK(result);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP', description: 'Resend OTP code to email' })
  @ApiBody({ type: ResendOtpDto })
  @ApiResponse({ status: 200, description: 'OTP resent successfully' })
  async resendOtp(@Body() dto: ResendOtpDto) {
    await this.authService.resendOtp(dto.token);
    return Response.OK({ message: 'OTP resent successfully' });
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset', description: 'Send OTP for password reset' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Returns reset token',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(ForgotPasswordResponseDto) } } },
      ],
    },
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const resetToken = await this.authService.forgotPassword(dto.email);
    return Response.OK({ resetToken });
  }

  @Post('verify-forgot-password-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify forgot password OTP', description: 'Verify OTP and get reset token' })
  @ApiBody({ type: VerifyForgotPasswordOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Returns reset token',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(ForgotPasswordResponseDto) } } },
      ],
    },
  })
  async verifyForgotPasswordOtp(@Body() dto: VerifyForgotPasswordOtpDto) {
    const resetToken = await this.authService.verifyForgotPasswordOtp(dto.token, dto.otpCode);
    return Response.OK({ resetToken });
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password', description: 'Reset password using reset token. Returns JWT tokens.' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Returns access token, refresh token, session ID, and user info',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(AuthResponseDto) } } },
      ],
    },
  })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: any) {
    const result = await this.authService.resetPassword(
      dto.token,
      dto.newPassword,
      req.ip,
      req.headers['user-agent'],
    );
    return Response.OK(result);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password', description: 'Change password for authenticated user. Requires JWT token.' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
    await this.authService.changePassword(
      req.user.userId,
      req.user.sessionId,
      dto.oldPassword,
      dto.newPassword,
      req.ip,
    );
    return Response.OK({ message: 'Password changed successfully' });
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token', description: 'Get new access token using refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Returns new access token',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(RefreshTokenResponseDto) } } },
      ],
    },
  })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: any,
    @Res() res: ExpressResponse,
  ) {
    let token = dto.refreshToken;
    if (token === 'google-sso' && req.cookies?.refreshToken) {
      token = req.cookies.refreshToken;
    }

    const accessToken = await this.authService.refreshToken(token);

    if (req.cookies?.accessToken) {
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 60 * 60 * 1000, // 1 hour
      });
    }

    return res.status(HttpStatus.OK).json(Response.OK({ accessToken }));
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout',
    description: 'Logout and revoke session. Requires JWT token.',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Req() req: any, @Res() res: ExpressResponse) {
    await this.authService.logout(req.user.sessionId);

    // Clear cookies
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
    };
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('sessionId', cookieOptions);

    return res.status(HttpStatus.OK).json(Response.OK({ message: 'Logged out successfully' }));
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth login', description: 'Redirect to Google for authentication' })
  async googleAuth() {
    // Passport will redirect to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google OAuth callback', description: 'Handle Google OAuth callback. Sets httpOnly cookies and redirects to FE.' })
  async googleCallback(@Req() req: any, @Res() res: ExpressResponse) {
    const result = await this.authService.googleLogin(
      req.user,
      req.ip,
      req.headers['user-agent'],
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };

    // Access token: short TTL (1h)
    res.cookie('accessToken', result.accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Refresh token: long TTL (7 days)
    res.cookie('refreshToken', result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Session ID: same as refresh token TTL
    res.cookie('sessionId', result.sessionId, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // User info (non-sensitive, readable by JS) — passed in query parameter for maximum reliability
    const encodedUser = encodeURIComponent(JSON.stringify(result.user));

    return res.redirect(`${frontendUrl}/auth/google/callback?user=${encodedUser}`);
  }
}
