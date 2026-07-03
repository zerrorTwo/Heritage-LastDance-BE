import { ApiProperty } from '@nestjs/swagger';
import { UserProfileDto } from '../../user/dto/user-response.dto';
export { UserProfileDto } from '../../user/dto/user-response.dto';

// Base response for token-based auth
export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token for API authentication',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'JWT refresh token for getting new access token',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.example-refresh-token',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Session ID',
    example: 'session-123456789',
  })
  sessionId!: string;

  @ApiProperty({ description: 'User information', type: () => UserProfileDto })
  user!: UserProfileDto;
}

// Response for OTP verification (returns auth token)
export class OtpVerifyResponseDto {
  @ApiProperty({
    description: 'Auth token for OTP verification',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicHVycG9zZSI6Im90cC12ZXJpZmljYXRpb24iLCJpYXQiOjE1MTYyMzkwMjJ9.example',
  })
  authToken!: string;
}

// Response for forgot password (returns token)
export class ForgotPasswordResponseDto {
  @ApiProperty({
    description: 'Reset token for password reset',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicHVycG9zZSI6InBhc3N3b3JkLXJlc2V0IiwiaWF0IjoxNTE2MjM5MDIyfQ.example',
  })
  resetToken!: string;
}

// Response for Google OAuth callback
export class GoogleLoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.example-refresh-token',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Session ID',
    example: 'session-123456789',
  })
  sessionId!: string;

  @ApiProperty({ description: 'User information', type: () => UserProfileDto })
  user!: UserProfileDto;
}

// Response for token refresh
export class RefreshTokenResponseDto {
  @ApiProperty({
    description: 'New JWT access token',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  accessToken!: string;
}

// Response for logout
export class LogoutResponseDto {
  @ApiProperty({
    description: 'Logout success message',
    example: 'Logged out successfully',
  })
  message!: string;
}
