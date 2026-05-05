import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { AuthRepository } from './repository';
import { SessionRepository } from '../session/repository';
import { UserRepository } from '../user/repository';
import { AuditLogRepository } from '../audit-log/repository';
import { MailService } from '../../pkg/mail/mail.service';
import { hashBcrypt, compareBcrypt, md5 } from '../../utils/hash/hash.util';
import { generateOTP } from '../../utils/random/otp.util';
import {
  generateSecureToken,
  generateRefreshToken,
} from '../../utils/random/token.util';
import { recoverWalletAddress } from '../../utils/wallet/wallet.util';
import { ChallengeType, IdentifierType } from './model';
import { AuditAction } from '../audit-log/model';

// Helper to parse env numbers with fallback
const getEnvNumber = (key: string, fallback: number): number => {
  const val = process.env[key];
  return val ? parseFloat(val) : fallback;
};

// TTL values from config (in milliseconds)
const getOtpExpireMs = () =>
  getEnvNumber('OTP_EXPIRE_MINUTES', 5) * 60 * 1000;
const getOtpResendLimitMs = () =>
  getEnvNumber('OTP_RESEND_LIMIT_TTL_MINUTES', 60) * 60 * 1000;
const getMaxEmailAttempts = () =>
  getEnvNumber('OTP_MAX_ATTEMPTS_PER_HOUR', 5);
const getOtpMaxResendAttempts = () =>
  getEnvNumber('OTP_MAX_RESEND_ATTEMPTS', 5);
const getResetPasswordTokenMs = () =>
  getEnvNumber('RESET_PASSWORD_TOKEN_TTL_MINUTES', 15) * 60 * 1000;
const getMetaMaskChallengeMs = () =>
  getEnvNumber('METAMASK_CHALLENGE_TTL_MINUTES', 2) * 60 * 1000;
const getSessionTtlMs = () =>
  getEnvNumber('SESSION_TTL_HOURS', 24) * 60 * 60 * 1000;
const getRefreshTokenTtlMs = () =>
  getEnvNumber('REFRESH_TOKEN_TTL_DAYS', 7) * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authRepo: AuthRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly jwtService: JwtService,
    private readonly auditRepo: AuditLogRepository,
    @Inject(MailService) private readonly mailService: MailService,
  ) {}

  async signIn(
    email: string,
    password: string,
    ipAddress: string,
    deviceInfo?: string,
  ) {
    const currentUser = await this.userRepo.findByEmail(email);
    if (!currentUser) {
      throw new UnauthorizedException('Invalid email or password!');
    }

    const isMatch = await compareBcrypt(password, currentUser.password!);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password!');
    }

    if (!currentUser.isActiveUser()) {
      throw new BadRequestException('User is inactive.');
    }

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = md5(refreshToken);
    const now = new Date();
    const sessionTtlMs = getSessionTtlMs();
    const refreshTokenTtlMs = getRefreshTokenTtlMs();

    const newSession = await this.sessionRepo.create({
      userId: currentUser.id,
      refreshTokenHash,
      ipAddress,
      deviceInfo: deviceInfo ?? null,
      expiredAt: new Date(now.getTime() + sessionTtlMs),
      refreshedExpiredAt: new Date(now.getTime() + refreshTokenTtlMs),
    });

    const accessToken = this.createAccessToken(currentUser.id, newSession.id);

    await this.auditRepo.create({
      userId: currentUser.id,
      action: AuditAction.LOGIN,
      resourceType: 'SESSION',
      resourceId: newSession.id,
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      sessionId: newSession.id,
      user: currentUser,
    };
  }

  async signUp(email: string, password: string): Promise<string> {
    await this.checkUserNotExists(email);
    await this.validateEmailAttempts(email, ChallengeType.SIGNUP);

    const otpCode = generateOTP();

    await this.mailService.sendOtpEmail(email, otpCode);

    const hashedOTP = await hashBcrypt(otpCode);
    const hashedPassword = await hashBcrypt(password);

    const authToken = generateSecureToken(32);
    const authTokenHash = md5(authToken);
    const now = new Date();

    await this.authRepo.upsert({
      challengeType: ChallengeType.SIGNUP,
      identifierType: IdentifierType.EMAIL,
      identifier: email,
      tempPassword: hashedPassword,
      challenge: hashedOTP,
      expiredAt: new Date(now.getTime() + getOtpExpireMs()),
      attempts: 0,
      authToken: authTokenHash,
    });

    return authToken;
  }

  async verifyOTP(
    token: string,
    otpCode: string,
    ipAddress: string,
    deviceInfo?: string,
  ) {
    const now = new Date();
    const authChallenge = await this.getValidAuthChallenge(token, now);

    const isOtpValid = await compareBcrypt(otpCode, authChallenge.challenge);
    if (!isOtpValid) {
      authChallenge.attempts += 1;
      await this.authRepo.upsert(authChallenge);
      throw new BadRequestException('Invalid or expired OTP code!');
    }

    const existingUser = await this.userRepo.findByEmail(authChallenge.identifier);
    if (existingUser) {
      throw new ConflictException('User already exists!');
    }

    const currentUser = await this.userRepo.create({
      email: authChallenge.identifier,
      password: authChallenge.tempPassword,
    });

    authChallenge.verifiedAt = now;
    authChallenge.isUsed = true;
    await this.authRepo.upsert(authChallenge);

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = md5(refreshToken);
    const now2 = new Date();
    const sessionTtlMs = getSessionTtlMs();
    const refreshTokenTtlMs = getRefreshTokenTtlMs();

    const session = await this.sessionRepo.create({
      userId: currentUser.id,
      refreshTokenHash,
      ipAddress,
      deviceInfo: deviceInfo ?? null,
      expiredAt: new Date(now2.getTime() + sessionTtlMs),
      refreshedExpiredAt: new Date(now2.getTime() + refreshTokenTtlMs),
    });

    const accessToken = this.createAccessToken(currentUser.id, session.id);

    authChallenge.isUsed = true;
    await this.authRepo.upsert(authChallenge);

    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
      user: currentUser,
    };
  }

  async resendOtp(token: string): Promise<void> {
    const authChallenge = await this.authRepo.getByAuthToken(token);
    if (!authChallenge) {
      throw new BadRequestException('Invalid session to resend OTP!');
    }

    if (authChallenge.verifiedAt) {
      throw new BadRequestException(
        'User already verified, please sign in instead.',
      );
    }

    const now = new Date();
    this.validateAttempts(authChallenge, now);

    const otpCode = generateOTP();
    this.mailService
      .sendOtpEmail(authChallenge.identifier, otpCode)
      .catch(console.error);

    const hashedOTP = await hashBcrypt(otpCode);

    authChallenge.attempts += 1;
    authChallenge.expiredAt = new Date(now.getTime() + getOtpExpireMs());
    authChallenge.challenge = hashedOTP;

    await this.authRepo.upsert(authChallenge);
  }

  async forgotPassword(email: string): Promise<string> {
    const authToken = generateSecureToken(16);

    const currentUser = await this.userRepo.findByEmail(email);
    if (!currentUser) {
      return authToken;
    }

    if (!currentUser.isActiveUser()) {
      throw new BadRequestException('User is inactive!');
    }

    await this.validateEmailAttempts(email, ChallengeType.FORGOT_PASSWORD);

    const otpCode = generateOTP();
    console.log(`[EMAIL] Send Forgot Password OTP to ${email}: ${otpCode}`);

    await this.mailService.sendForgotPasswordEmail(email, otpCode);

    const hashedOTP = await hashBcrypt(otpCode);
    const authTokenHash = md5(authToken);
    const now = new Date();

    await this.authRepo.upsert({
      challengeType: ChallengeType.FORGOT_PASSWORD,
      identifierType: IdentifierType.EMAIL,
      identifier: email,
      tempPassword: null,
      challenge: hashedOTP,
      expiredAt: new Date(now.getTime() + getOtpExpireMs()),
      attempts: 0,
      authToken: authTokenHash,
    });

    return authToken;
  }

  async verifyForgotPasswordOtp(
    authToken: string,
    otp: string,
  ): Promise<string> {
    const now = new Date();
    const authChallenge = await this.getValidAuthChallenge(authToken, now);

    const isOtpValid = await compareBcrypt(otp, authChallenge.challenge);
    if (!isOtpValid) {
      throw new BadRequestException('Invalid or expired OTP code!');
    }

    authChallenge.verifiedAt = now;

    const resetPwdToken = generateSecureToken();
    const resetPwdTokenHash = md5(resetPwdToken);

    await this.authRepo.createPasswordReset({
      identifier: authChallenge.identifier,
      expiredAt: new Date(now.getTime() + getResetPasswordTokenMs()),
      resetToken: resetPwdTokenHash,
    });

    return resetPwdToken;
  }

  async resetPassword(
    token: string,
    newPassword: string,
    ipAddress: string,
    deviceInfo?: string,
  ) {
    const passwordReset = await this.getValidPasswordReset(token);

    const currentUser = await this.userRepo.findByEmail(
      passwordReset.identifier,
    );
    if (!currentUser) {
      throw new BadRequestException('User not found!');
    }

    const isSame = await compareBcrypt(newPassword, currentUser.password!);
    if (isSame) {
      throw new BadRequestException(
        'New password must be different from the old password!',
      );
    }

    currentUser.password = await hashBcrypt(newPassword);
    await this.userRepo.update(currentUser);

    await this.sessionRepo.revokeAllByUserId(currentUser.id);

    const now = new Date();
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = md5(refreshToken);
    const sessionTtlMs = getSessionTtlMs();
    const refreshTokenTtlMs = getRefreshTokenTtlMs();

    const newSession = await this.sessionRepo.create({
      userId: currentUser.id,
      refreshTokenHash,
      ipAddress,
      deviceInfo: deviceInfo ?? null,
      expiredAt: new Date(now.getTime() + sessionTtlMs),
      refreshedExpiredAt: new Date(now.getTime() + refreshTokenTtlMs),
    });

    const accessToken = this.createAccessToken(currentUser.id, newSession.id);

    await this.auditRepo.create({
      userId: currentUser.id,
      action: AuditAction.RESET_PASSWORD,
      resourceType: 'USER',
      resourceId: currentUser.id,
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      sessionId: newSession.id,
      user: currentUser,
    };
  }

  async changePassword(
    userId: string,
    sessionId: string,
    oldPassword: string,
    newPassword: string,
    ipAddress: string,
  ): Promise<void> {
    const currentUser = await this.userRepo.findById(userId);
    if (!currentUser) throw new BadRequestException('User not found!');

    const isOldCorrect = await compareBcrypt(
      oldPassword,
      currentUser.password!,
    );
    if (!isOldCorrect) {
      throw new BadRequestException('Current password is incorrect!');
    }

    const isSame = await compareBcrypt(newPassword, currentUser.password!);
    if (isSame) {
      throw new BadRequestException(
        'New password must be different from the old password!',
      );
    }

    currentUser.password = await hashBcrypt(newPassword);
    await this.userRepo.update(currentUser);

    await this.sessionRepo.revokeAllByUserId(currentUser.id, [sessionId]);

    await this.auditRepo.create({
      userId: currentUser.id,
      action: AuditAction.CHANGE_PASSWORD,
      resourceType: 'USER',
      resourceId: currentUser.id,
      ipAddress,
    });
  }

  async metaMaskChallenge(walletAddress: string) {
    const existUser = await this.userRepo.findByWalletAddress(walletAddress);
    if (!existUser) {
      throw new BadRequestException(
        'Wallet is not linked to any active account!',
      );
    }

    const nonce = generateSecureToken(16);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + getMetaMaskChallengeMs());

    await this.authRepo.upsert({
      challengeType: ChallengeType.WALLET_SIGNIN,
      identifierType: IdentifierType.WALLET,
      identifier: walletAddress,
      tempPassword: null,
      challenge: nonce,
      expiredAt: expiresAt,
      attempts: 0,
      authToken: '',
    });

    const message = this.buildMetaMaskMessage(walletAddress, nonce, false);

    return { message, expiresAt: expiresAt.toISOString() };
  }

  async metaMaskSignIn(
    walletAddress: string,
    message: string,
    signature: string,
    ipAddress: string,
    deviceInfo?: string,
  ) {
    const now = new Date();
    const parsed = this.parseMetaMaskMessage(message);

    const authChallenge = await this.authRepo.getByIdentifier(
      parsed.walletAddress,
    );
    if (!authChallenge) {
      throw new UnauthorizedException('Invalid meta mask challenge!');
    }

    if (
      parsed.walletAddress.toLowerCase() !==
      authChallenge.identifier.toLowerCase()
    ) {
      throw new UnauthorizedException('Invalid meta mask challenge!');
    }

    if (now > authChallenge.expiredAt) {
      throw new UnauthorizedException('Meta mask challenge expired!');
    }

    const recoveredAddress = recoverWalletAddress(message, signature);
    if (recoveredAddress.toLowerCase() !== parsed.walletAddress.toLowerCase()) {
      throw new UnauthorizedException('Invalid meta mask signature!');
    }

    const currentUser = await this.createOrGetWalletUser(
      authChallenge.identifier,
    );

    authChallenge.verifiedAt = now;
    await this.authRepo.upsert(authChallenge);

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = md5(refreshToken);
    const now2 = new Date();
    const sessionTtlMs = getSessionTtlMs();
    const refreshTokenTtlMs = getRefreshTokenTtlMs();

    const newSession = await this.sessionRepo.create({
      userId: currentUser.id,
      refreshTokenHash,
      ipAddress,
      deviceInfo: deviceInfo ?? null,
      expiredAt: new Date(now2.getTime() + sessionTtlMs),
      refreshedExpiredAt: new Date(now2.getTime() + refreshTokenTtlMs),
    });

    const accessToken = this.createAccessToken(currentUser.id, newSession.id);

    await this.auditRepo.create({
      userId: currentUser.id,
      action: AuditAction.LOGIN,
      resourceType: 'USER',
      resourceId: currentUser.id,
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      sessionId: newSession.id,
      user: currentUser,
    };
  }

  async linkWallet(userId: string, walletAddress: string) {
    const currentUser = await this.userRepo.findById(userId);
    if (!currentUser) throw new BadRequestException('User not found!');

    if (currentUser.walletAddress) {
      throw new BadRequestException('Wallet already linked!');
    }

    const existWalletUser =
      await this.userRepo.findByWalletAddress(walletAddress);
    if (existWalletUser) {
      throw new BadRequestException(
        'Wallet already linked to another account!',
      );
    }

    const nonce = generateSecureToken(16);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + getMetaMaskChallengeMs());

    await this.authRepo.upsert({
      challengeType: ChallengeType.WALLET_LINK,
      identifierType: IdentifierType.WALLET,
      identifier: walletAddress,
      tempPassword: null,
      challenge: nonce,
      expiredAt: expiresAt,
      attempts: 0,
      authToken: '',
    });

    const message = this.buildMetaMaskMessage(walletAddress, nonce, true);
    return { message, expiresAt: expiresAt.toISOString() };
  }

  async verifyLinkWallet(
    userId: string,
    message: string,
    signature: string,
  ): Promise<void> {
    const now = new Date();
    const currentUser = await this.userRepo.findById(userId);
    if (!currentUser) throw new BadRequestException('User not found!');

    const parsed = this.parseMetaMaskMessage(message);
    const authChallenge = await this.authRepo.getByIdentifier(
      parsed.walletAddress,
    );
    if (!authChallenge) {
      throw new UnauthorizedException('Invalid meta mask challenge!');
    }

    if (
      parsed.walletAddress.toLowerCase() !==
      authChallenge.identifier.toLowerCase()
    ) {
      throw new UnauthorizedException('Invalid meta mask challenge!');
    }

    if (now > authChallenge.expiredAt) {
      throw new UnauthorizedException('Meta mask challenge expired!');
    }

    const recoveredAddress = recoverWalletAddress(message, signature);
    if (recoveredAddress.toLowerCase() !== parsed.walletAddress.toLowerCase()) {
      throw new UnauthorizedException('Invalid meta mask signature!');
    }

    currentUser.walletAddress = parsed.walletAddress;
    await this.userRepo.update(currentUser);

    authChallenge.verifiedAt = now;
    await this.authRepo.upsert(authChallenge);
  }

  async refreshToken(rawRefreshToken: string): Promise<string> {
    const { userId, sessionId } =
      await this.checkUserAuthorization(rawRefreshToken);
    return this.createAccessToken(userId, sessionId);
  }

  async logout(sessionId: string): Promise<void> {
    const session = await this.sessionRepo.getById(sessionId);
    if (!session) throw new BadRequestException('Invalid session!');

    await this.sessionRepo.deleteById(session.id);

    await this.auditRepo.create({
      userId: session.userId,
      action: AuditAction.LOGOUT,
      resourceType: 'SESSION',
      resourceId: session.id,
      ipAddress: session.ipAddress,
    });
  }

  async cleanUpExpiredChallenges(): Promise<void> {
    await this.authRepo.deleteExpiredChallenges();
    await this.authRepo.deletePasswordResetExpiredChallenges();
  }

  private createAccessToken(userId: string, sessionId: string): string {
    return this.jwtService.sign({ sub: userId, sessionId });
  }

  private async checkUserNotExists(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (user?.isActiveUser()) {
      throw new ConflictException('User already exists!');
    }
  }

  private validateAttempts(authChallenge: any, now: Date): void {
    const elapsed = now.getTime() - new Date(authChallenge.createdAt).getTime();

    if (
      authChallenge.attempts >= getOtpMaxResendAttempts() &&
      elapsed <= getOtpResendLimitMs()
    ) {
      throw new HttpException(
        'Too many OTP resend attempts, please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (elapsed > getOtpResendLimitMs()) {
      authChallenge.attempts = 0;
    }
  }

  private async validateEmailAttempts(
    email: string,
    challengeType: string,
  ): Promise<void> {
    const count = await this.authRepo.countByIdentifierAndChallengeType(
      email,
      challengeType,
    );
    if (count >= getMaxEmailAttempts()) {
      throw new HttpException(
        'Too many OTP resend attempts, please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async getValidAuthChallenge(token: string, now: Date): Promise<any> {
    const hash = md5(token);
    const authChallenge = await this.authRepo.getByAuthToken(hash);

    if (!authChallenge)
      throw new BadRequestException('Invalid session to verify!');
    if (authChallenge.verifiedAt)
      throw new BadRequestException('OTP code already verified!');
    if (authChallenge.isUsed)
      throw new BadRequestException('OTP code already used!');

    this.validateAttempts(authChallenge, now);

    if (now > authChallenge.expiredAt) {
      throw new BadRequestException('OTP code has expired!');
    }

    return authChallenge;
  }

  private async getValidPasswordReset(resetToken: string): Promise<any> {
    const hash = md5(resetToken);
    const passwordReset = await this.authRepo.getPasswordReset(hash);

    if (!passwordReset)
      throw new BadRequestException('Invalid session to verify!');
    if (new Date() > passwordReset.expiredAt) {
      throw new BadRequestException('Reset password token has expired!');
    }

    return passwordReset;
  }

  private buildMetaMaskMessage(
    walletAddress: string,
    nonce: string,
    isLinking: boolean,
  ): string {
    const statement = isLinking
      ? 'Click to link your wallet and accept'
      : 'Click to sign in and accept';

    return [
      'Welcome to AIOZ!',
      '',
      `${statement} the AIOZ Terms of Service (https://aiozai.network/terms) and Privacy Policy (https://aiozai.network/privacy).`,
      '',
      'This request will not trigger a blockchain transaction or cost any gas fees.',
      '',
      'Your authentication status will reset after 24 hours.',
      '',
      'Wallet address:',
      walletAddress,
      '',
      'Nonce:',
      nonce,
    ].join('\n');
  }

  private parseMetaMaskMessage(message: string): {
    walletAddress: string;
    nonce: string;
  } {
    const lines = message.split('\n');
    let walletAddress = '';
    let nonce = '';

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Wallet address:') && i + 1 < lines.length) {
        walletAddress = lines[i + 1].trim();
      }
      if (lines[i].includes('Nonce:') && i + 1 < lines.length) {
        nonce = lines[i + 1].trim();
      }
    }

    if (!walletAddress || !nonce) {
      throw new BadRequestException('Invalid meta mask challenge!');
    }

    return { walletAddress, nonce };
  }

  private async createOrGetWalletUser(walletAddress: string): Promise<any> {
    const existUser = await this.userRepo.findByWalletAddress(walletAddress);
    if (existUser) {
      if (!existUser.isActiveUser())
        throw new BadRequestException('User is inactive!');
      return existUser;
    }

    try {
      return await this.userRepo.create({ walletAddress });
    } catch (err: any) {
      if (err?.code === '23505') {
        return this.userRepo.findByWalletAddress(walletAddress);
      }
      throw err;
    }
  }

  private async checkUserAuthorization(
    rawRefreshToken: string,
  ): Promise<{ userId: string; sessionId: string }> {
    const hash = md5(rawRefreshToken);
    const session = await this.sessionRepo.getByRefreshToken(hash);

    if (!session) throw new UnauthorizedException('Session not found!');
    if (session.isRevoked)
      throw new UnauthorizedException('Session is revoked!');
    if (new Date() > session.refreshedExpiredAt) {
      throw new UnauthorizedException('Refresh token expired!');
    }

    await this.sessionRepo.update({ id: session.id, lastUsedAt: new Date() });

    return { userId: session.userId, sessionId: session.id };
  }
}
