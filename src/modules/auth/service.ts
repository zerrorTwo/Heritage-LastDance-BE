import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AUTH_CHALLENGE_REPOSITORY,
  SESSION_REPOSITORY,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens';
import type { IAuthChallengeRepository } from './model';
import type { ISessionRepository } from '../session/model';
import type { IUserRepository } from '../users/model';
import { MailService } from '../../pkg/mail/mail.service';
import { hashBcrypt, compareBcrypt, md5 } from '../../utils/hash/hash.util';
import { generateOTP } from '../../utils/random/otp.util';
import {
  generateRefreshToken,
  generateSecureToken,
} from '../../utils/random/token.util';
import {
  newBadRequestError,
  newConflictError,
  newInternalServerError,
  newNotFoundError,
  newTooManyRequestsError,
  newUnauthorizedError,
} from '../../common/response/error-factory';
import { SignUpDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SignInDto } from './dto/signin.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyForgotPasswordDto } from './dto/verify-forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { GoogleProfile } from '../../common/strategies/google.strategy';
import { AuditLogService } from '../audit-log/service';
import { AuditAction } from '../audit-log/enum';
import loadEnv from '../../config/configuration';

const env = loadEnv();

const OTP_EXPIRE_MINUTES = Number(env.OTP_EXPIRE_MINUTES ?? 5);
const OTP_MAX_PER_HOUR = Number(env.OTP_MAX_ATTEMPTS_PER_HOUR ?? 5);
const JWT_EXPIRES_IN = (env.JWT_EXPIRES_IN as string) ?? '15m';
const REFRESH_EXPIRES_DAYS = Number(env.JWT_REFRESH_EXPIRES_DAYS ?? 30);
const FRONTEND_URL = (env.FRONTEND_URL as string) ?? 'http://localhost:3000';

interface ResetTokenEntry {
  userId: string;
  expiresAt: Date;
}

/**
 * AuthService — owns all authentication business logic.
 *
 * Convention rules enforced here:
 *  - Assumes input is already validated (done in controller/DTO layer)
 *  - NO re-validation of DTOs
 *  - NO HTTP response construction (controller handles that)
 *  - NO logging (filter handles that via HttpError.internal)
 *  - Errors thrown using factory functions from error-factory.ts ONLY
 *  - Depends on repository interfaces, never on concrete classes
 */
@Injectable()
export class AuthService {
  /**
   * In-memory reset-token store (valid 10 min).
   * Replace with Redis for multi-instance deployments.
   */
  private readonly resetTokenStore = new Map<string, ResetTokenEntry>();

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,

    @Inject(AUTH_CHALLENGE_REPOSITORY)
    private readonly challengeRepo: IAuthChallengeRepository,

    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepo: ISessionRepository,

    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ── 5.1 Sign Up ────────────────────────────────────────────────────────────

  async signUp(
    dto: SignUpDto,
    ip: string,
  ): Promise<{ message: string; expiresIn: number }> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw newConflictError('Email is already registered');
    }

    const count = await this.challengeRepo.countByIdentifierLastHour(
      dto.email,
      'signup',
    );
    if (count >= OTP_MAX_PER_HOUR) {
      throw newTooManyRequestsError(
        'Too many OTP requests. Please try again in 1 hour',
      );
    }

    try {
      const otp = generateOTP();
      const hashedOtp = await hashBcrypt(otp);
      const hashedPassword = await hashBcrypt(dto.password);
      const expiredAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);

      await this.challengeRepo.create({
        challengeType: 'signup',
        identifier: dto.email,
        tempPassword: hashedPassword,
        challenge: hashedOtp,
        expiredAt,
      });

      await this.mailService.sendSignUpEmail([dto.email], {
        verificationCode: otp,
      });

      await this.auditLogService.logAuthAction({
        action: AuditAction.SIGNUP,
        ipAddress: ip.substring(0, 50),
        metadata: {
          email: dto.email,
        },
      });
    } catch (err) {
      throw newInternalServerError(err);
    }

    return {
      message: 'OTP sent to your email',
      expiresIn: OTP_EXPIRE_MINUTES * 60,
    };
  }

  // ── 5.2 Verify OTP → Create User ───────────────────────────────────────────

  async verifyOtp(dto: VerifyOtpDto): Promise<{ verifyToken: string }> {
    const challenge =
      await this.challengeRepo.findLatestPendingWithTempPassword(
        dto.email,
        'signup',
      );
    if (!challenge) {
      throw newNotFoundError('Challenge not found or expired');
    }

    if (challenge.attempts >= 5) {
      throw newTooManyRequestsError(
        'Too many failed attempts. Please request a new OTP',
      );
    }

    const isValid = await compareBcrypt(dto.otp, challenge.challenge);
    if (!isValid) {
      await this.challengeRepo.incrementAttempts(challenge.id);
      throw newBadRequestError('Invalid OTP');
    }

    await this.challengeRepo.markVerified(challenge.id);

    await this.userRepo.create({
      email: dto.email,
      password: challenge.tempPassword,
      isVerified: true,
    });

    const createdUser = await this.userRepo.findByEmail(dto.email);
    await this.auditLogService.logAuthAction({
      userId: createdUser?.id ?? null,
      action: AuditAction.VERIFY_OTP,
      metadata: {
        email: dto.email,
      },
    });

    // Return a short-lived verify token — NEVER expose challenge.id
    const verifyToken = generateSecureToken(16);
    return { verifyToken };
  }

  // ── 5.3 Sign In ────────────────────────────────────────────────────────────

  async signIn(
    dto: SignInDto,
    ip: string,
    deviceInfo: string | null,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const user = await this.userRepo.findByEmailWithPassword(dto.email);
    if (!user) {
      throw newBadRequestError('Invalid email or password');
    }

    const isPasswordValid = await compareBcrypt(dto.password, user.password);
    if (!isPasswordValid) {
      throw newBadRequestError('Invalid email or password');
    }

    const rawRefreshToken = generateRefreshToken();
    const md5Hash = md5(rawRefreshToken);
    const now = new Date();
    const expiredAt = new Date(
      now.getTime() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    );

    const session = await this.sessionRepo.create({
      userId: user.id,
      refreshToken: md5Hash,
      ipAddress: ip.substring(0, 50),
      deviceInfo,
      expiredAt,
      refreshedExpiredAt: expiredAt,
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      sessionId: session.id,
    });

    await this.auditLogService.logAuthAction({
      userId: user.id,
      action: AuditAction.SIGNIN,
      ipAddress: ip.substring(0, 50),
      metadata: {
        email: user.email,
        sessionId: session.id,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken, expiresIn: 900 };
  }

  // ── 5.4 Refresh Token ──────────────────────────────────────────────────────

  async refreshToken(dto: RefreshTokenDto): Promise<{ accessToken: string }> {
    const md5Hash = md5(dto.refreshToken);
    const session = await this.sessionRepo.findByRefreshToken(md5Hash);
    if (!session) {
      throw newUnauthorizedError(
        new Error('Refresh token not found or revoked'),
      );
    }

    if (session.expiredAt < new Date()) {
      throw newUnauthorizedError(new Error('Session has absolutely expired'));
    }

    const user = await this.userRepo.findById(session.userId);
    if (!user) {
      throw newUnauthorizedError(new Error('User not found for session'));
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      sessionId: session.id,
    });

    await this.sessionRepo.updateLastUsed(session.id);

    await this.auditLogService.logAuthAction({
      userId: user.id,
      action: AuditAction.REFRESH_TOKEN,
      metadata: {
        sessionId: session.id,
      },
    });

    return { accessToken };
  }

  // ── 5.5 Logout ─────────────────────────────────────────────────────────────

  async logout(sessionId: string): Promise<{ message: string }> {
    await this.sessionRepo.revoke(sessionId);

    const session = await this.sessionRepo.findById(sessionId);
    await this.auditLogService.logAuthAction({
      userId: session?.userId ?? null,
      action: AuditAction.LOGOUT,
      metadata: {
        sessionId,
      },
    });
    return { message: 'Logged out successfully' };
  }

  // ── 5.7 Forgot Password (anti-enumeration) ─────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    /**
     * Anti-enumeration: always return the same response regardless of
     * whether the email exists. This prevents user account discovery.
     */
    const SAFE_RESPONSE = {
      message: 'If your email is registered, you will receive an OTP',
    };

    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) return SAFE_RESPONSE;

    const count = await this.challengeRepo.countByIdentifierLastHour(
      dto.email,
      'forgot_password',
    );
    if (count >= OTP_MAX_PER_HOUR) return SAFE_RESPONSE;

    try {
      const otp = generateOTP();
      const hashedOtp = await hashBcrypt(otp);
      const expiredAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);

      await this.challengeRepo.create({
        challengeType: 'forgot_password',
        identifier: dto.email,
        challenge: hashedOtp,
        expiredAt,
      });

      await this.mailService.sendLoginEmail([dto.email], {
        loginCode: otp,
      });

      await this.auditLogService.logAuthAction({
        userId: user.id,
        action: AuditAction.FORGOT_PASSWORD,
        metadata: {
          email: dto.email,
        },
      });
    } catch (err) {
      // Swallow — anti-enumeration requires same response on error
    }

    return SAFE_RESPONSE;
  }

  // ── 5.8 Verify Forgot-Password OTP ────────────────────────────────────────

  async verifyForgotPassword(
    dto: VerifyForgotPasswordDto,
  ): Promise<{ resetToken: string }> {
    const challenge = await this.challengeRepo.findLatestPending(
      dto.email,
      'forgot_password',
    );
    if (!challenge) {
      throw newNotFoundError('Challenge not found or expired');
    }

    if (challenge.attempts >= 5) {
      throw newTooManyRequestsError(
        'Too many failed attempts. Please request a new OTP',
      );
    }

    const isValid = await compareBcrypt(dto.otp, challenge.challenge);
    if (!isValid) {
      await this.challengeRepo.incrementAttempts(challenge.id);
      throw newBadRequestError('Invalid OTP');
    }

    await this.challengeRepo.markVerified(challenge.id);

    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw newNotFoundError('User not found');
    }

    // Generate reset token — NEVER expose challenge.id
    const resetToken = generateSecureToken(16);
    this.resetTokenStore.set(resetToken, {
      userId: user.id,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await this.auditLogService.logAuthAction({
      userId: user.id,
      action: AuditAction.VERIFY_FORGOT_OTP,
      metadata: {
        email: dto.email,
      },
    });

    return { resetToken };
  }

  // ── 5.9 Change Password ────────────────────────────────────────────────────

  async changePassword(dto: ChangePasswordDto): Promise<{ message: string }> {
    const entry = this.resetTokenStore.get(dto.resetToken);
    if (!entry || entry.expiresAt < new Date()) {
      this.resetTokenStore.delete(dto.resetToken);
      throw newBadRequestError('Reset token is invalid or expired');
    }

    const hashedPassword = await hashBcrypt(dto.newPassword);

    await this.userRepo.updatePassword(entry.userId, hashedPassword);
    await this.sessionRepo.revokeAllByUserId(entry.userId);
    this.resetTokenStore.delete(dto.resetToken);

    await this.auditLogService.logAuthAction({
      userId: entry.userId,
      action: AuditAction.CHANGE_PASSWORD,
    });

    return { message: 'Password changed successfully' };
  }

  // ── 5.6 Google OAuth Login ─────────────────────────────────────────────────

  async googleLogin(
    profile: GoogleProfile,
    ip: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    redirectUrl: string;
  }> {
    const user = await this.userRepo.upsertGoogleUser(profile);

    const rawRefreshToken = generateRefreshToken();
    const md5Hash = md5(rawRefreshToken);
    const expiredAt = new Date(
      Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    );

    const session = await this.sessionRepo.create({
      userId: user.id,
      refreshToken: md5Hash,
      ipAddress: ip.substring(0, 50),
      deviceInfo: 'Google OAuth',
      expiredAt,
      refreshedExpiredAt: expiredAt,
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      sessionId: session.id,
    });

    const redirectUrl = `${FRONTEND_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${rawRefreshToken}`;

    await this.auditLogService.logAuthAction({
      userId: user.id,
      action: AuditAction.SIGNIN_GOOGLE,
      ipAddress: ip.substring(0, 50),
      metadata: {
        email: user.email,
        sessionId: session.id,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken, redirectUrl };
  }
}
