import { ApiProperty } from '@nestjs/swagger';
import { UserModel } from '../../user/model';

// Base response for token-based auth
export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token for API authentication' })
  accessToken!: string;

  @ApiProperty({ description: 'JWT refresh token for getting new access token' })
  refreshToken!: string;

  @ApiProperty({ description: 'Session ID' })
  sessionId!: string;

  @ApiProperty({ description: 'User information', type: () => UserModel })
  user!: UserModel;
}

// Response for OTP verification (returns auth token)
export class OtpVerifyResponseDto {
  @ApiProperty({ description: 'Auth token for OTP verification' })
  authToken!: string;
}

// Response for forgot password (returns token)
export class ForgotPasswordResponseDto {
  @ApiProperty({ description: 'Reset token for password reset' })
  resetToken!: string;
}

// Response for Google OAuth callback
export class GoogleLoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken!: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken!: string;

  @ApiProperty({ description: 'Session ID' })
  sessionId!: string;

  @ApiProperty({ description: 'User information', type: () => UserModel })
  user!: UserModel;
}

// Response for token refresh
export class RefreshTokenResponseDto {
  @ApiProperty({ description: 'New JWT access token' })
  accessToken!: string;
}

// Response for MetaMask challenge
export class MetaMaskChallengeResponseDto {
  @ApiProperty({ description: 'Challenge message to sign' })
  message!: string;

  @ApiProperty({ description: 'Challenge expiration time' })
  expiresAt!: string;
}

// Response for logout
export class LogoutResponseDto {
  @ApiProperty({ description: 'Logout success message' })
  message!: string;
}
