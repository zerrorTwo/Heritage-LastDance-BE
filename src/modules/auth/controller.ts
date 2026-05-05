import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { VerifyOtpDto, ResendOtpDto } from './dto/verify-otp.dto';
import {
  ForgotPasswordDto,
  VerifyForgotPasswordOtpDto,
  ResetPasswordDto,
} from './dto/forgot-password.dto';
import { ChangePasswordDto, RefreshTokenDto } from './dto/change-password.dto';
import {
  MetaMaskChallengeDto,
  MetaMaskSignInDto,
  LinkWalletDto,
  VerifyLinkWalletDto,
} from './dto/meta-mask.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() dto: SignUpDto): Promise<string> {
    return this.authService.signUp(dto.email, dto.password);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() dto: SignInDto, @Req() req: any) {
    return this.authService.signIn(
      dto.email,
      dto.password,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: any) {
    return this.authService.verifyOTP(
      dto.token,
      dto.otpCode,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendOtpDto): Promise<void> {
    return this.authService.resendOtp(dto.token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<string> {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('verify-forgot-password-otp')
  @HttpCode(HttpStatus.OK)
  async verifyForgotPasswordOtp(
    @Body() dto: VerifyForgotPasswordOtpDto,
  ): Promise<string> {
    return this.authService.verifyForgotPasswordOtp(dto.token, dto.otpCode);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: any) {
    return this.authService.resetPassword(
      dto.token,
      dto.newPassword,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: any,
  ): Promise<void> {
    return this.authService.changePassword(
      req.user.userId,
      req.user.sessionId,
      dto.oldPassword,
      dto.newPassword,
      req.ip,
    );
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<string> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any): Promise<void> {
    return this.authService.logout(req.user.sessionId);
  }

  @Post('metamask/challenge')
  async metaMaskChallenge(@Body() dto: MetaMaskChallengeDto) {
    return this.authService.metaMaskChallenge(dto.walletAddress);
  }

  @Post('metamask/signin')
  @HttpCode(HttpStatus.OK)
  async metaMaskSignIn(@Body() dto: MetaMaskSignInDto, @Req() req: any) {
    return this.authService.metaMaskSignIn(
      dto.walletAddress,
      dto.message,
      dto.signature,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('metamask/link')
  @UseGuards(JwtAuthGuard)
  async linkWallet(@Body() dto: LinkWalletDto, @Req() req: any) {
    return this.authService.linkWallet(req.user.userId, dto.walletAddress);
  }

  @Post('metamask/verify-link')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyLinkWallet(
    @Body() dto: VerifyLinkWalletDto,
    @Req() req: any,
  ): Promise<void> {
    return this.authService.verifyLinkWallet(
      req.user.userId,
      dto.message,
      dto.signature,
    );
  }
}
