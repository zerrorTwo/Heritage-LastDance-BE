import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './service';
import { AuthRepository } from './repository';
import { SessionRepository } from '../session/repository';
import { UserRepository } from '../user/repository';
import { AuditLogRepository } from '../audit-log/repository';
import { MailService } from '../../pkg/mail/mail.service';
import { ChallengeType } from './model';
import { AuditAction } from '../audit-log/model';

jest.mock('../../utils/hash/hash.util', () => ({
  hashBcrypt: jest.fn(),
  compareBcrypt: jest.fn(),
  md5: jest.fn(),
}));

jest.mock('../../utils/random/otp.util', () => ({
  generateOTP: jest.fn(),
}));

jest.mock('../../utils/random/token.util', () => ({
  generateSecureToken: jest.fn(),
  generateRefreshToken: jest.fn(),
}));

jest.mock('../../utils/wallet/wallet.util', () => ({
  recoverWalletAddress: jest.fn(),
}));

import { hashBcrypt, compareBcrypt, md5 } from '../../utils/hash/hash.util';
import { generateOTP } from '../../utils/random/otp.util';
import { generateSecureToken, generateRefreshToken } from '../../utils/random/token.util';
import { recoverWalletAddress } from '../../utils/wallet/wallet.util';

const createMockUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  password: 'hashedPassword',
  walletAddress: null,
  displayname: null,
  phone: null,
  gender: null,
  dateOfBirth: null,
  avatar: null,
  role: 'user',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  isActiveUser: jest.fn().mockReturnValue(true),
  ...overrides,
});

const createExpectedUserProfile = (user: ReturnType<typeof createMockUser>) => ({
  id: user.id,
  _id: user.id,
  email: user.email,
  walletAddress: user.walletAddress,
  displayname: user.displayname,
  phone: user.phone,
  gender: user.gender,
  dateOfBirth: user.dateOfBirth,
  avatar: user.avatar,
  role: user.role,
  isActive: user.isActive,
  account: {
    email: user.email,
    isActive: user.isActive,
    isVerified: true,
  },
  createdAt: user.createdAt,
  createAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const createMockSession = (overrides: Record<string, unknown> = {}) => ({
  id: 'session-1',
  userId: 'user-1',
  refreshTokenHash: 'hashed-refresh-token',
  ipAddress: '127.0.0.1',
  deviceInfo: null,
  isRevoked: false,
  lastUsedAt: null,
  expiredAt: new Date(Date.now() + 86400000),
  refreshedExpiredAt: new Date(Date.now() + 604800000),
  createdAt: new Date(),
  ...overrides,
});

const createMockAuthChallenge = (overrides: Record<string, unknown> = {}) => ({
  id: 'challenge-1',
  challengeType: ChallengeType.SIGNUP,
  identifierType: 'EMAIL',
  identifier: 'test@example.com',
  tempPassword: 'hashedPassword',
  challenge: 'hashedOtp',
  expiredAt: new Date(Date.now() + 3600000),
  attempts: 0,
  authToken: 'hashedAuthToken',
  verifiedAt: null,
  isUsed: false,
  createdAt: new Date(),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: UserRepository;
  let authRepo: AuthRepository;
  let sessionRepo: SessionRepository;
  let jwtService: JwtService;
  let auditRepo: AuditLogRepository;
  let mailService: MailService;

  const mockUserRepo = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByWalletAddress: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockAuthRepo = {
    upsert: jest.fn(),
    getByAuthToken: jest.fn(),
    getByIdentifier: jest.fn(),
    countByIdentifierAndChallengeType: jest.fn(),
    deleteExpiredChallenges: jest.fn(),
    createPasswordReset: jest.fn(),
    getPasswordReset: jest.fn(),
    deletePasswordResetExpiredChallenges: jest.fn(),
  };

  const mockSessionRepo = {
    create: jest.fn(),
    getById: jest.fn(),
    getByRefreshToken: jest.fn(),
    update: jest.fn(),
    deleteById: jest.fn(),
    revokeAllByUserId: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-access-token'),
  };

  const mockAuditRepo = {
    create: jest.fn(),
  };

  const mockMailService = {
    sendOtpEmail: jest.fn().mockResolvedValue(undefined),
    sendForgotPasswordEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: AuthRepository, useValue: mockAuthRepo },
        { provide: SessionRepository, useValue: mockSessionRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AuditLogRepository, useValue: mockAuditRepo },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get<UserRepository>(UserRepository);
    authRepo = module.get<AuthRepository>(AuthRepository);
    sessionRepo = module.get<SessionRepository>(SessionRepository);
    jwtService = module.get<JwtService>(JwtService);
    auditRepo = module.get<AuditLogRepository>(AuditLogRepository);
    mailService = module.get<MailService>(MailService);
  });

  describe('signIn', () => {
    const email = 'test@example.com';
    const password = 'plainPassword';
    const ipAddress = '127.0.0.1';

    it('should sign in user and return tokens', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession();
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (compareBcrypt as jest.Mock).mockResolvedValue(true);
      (generateRefreshToken as jest.Mock).mockReturnValue('raw-refresh-token');
      (md5 as jest.Mock).mockReturnValue('hashed-refresh-token');
      mockSessionRepo.create.mockResolvedValue(mockSession);

      const result = await service.signIn(email, password, ipAddress);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'raw-refresh-token',
        sessionId: mockSession.id,
        user: createExpectedUserProfile(mockUser),
      });
      expect(result.user).not.toHaveProperty('password');
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(email);
      expect(compareBcrypt).toHaveBeenCalledWith(password, mockUser.password);
      expect(mockSessionRepo.create).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        sessionId: mockSession.id,
      });
      expect(mockAuditRepo.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.LOGIN,
        resourceType: 'SESSION',
        resourceId: mockSession.id,
        ipAddress,
      });
    });

    it('should sign in with deviceInfo', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession();
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (compareBcrypt as jest.Mock).mockResolvedValue(true);
      (generateRefreshToken as jest.Mock).mockReturnValue('raw-refresh-token');
      (md5 as jest.Mock).mockReturnValue('hashed-refresh-token');
      mockSessionRepo.create.mockResolvedValue(mockSession);

      await service.signIn(email, password, ipAddress, 'Mozilla/5.0');

      expect(mockSessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ deviceInfo: 'Mozilla/5.0' }),
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.signIn(email, password, ipAddress),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(createMockUser());
      (compareBcrypt as jest.Mock).mockResolvedValue(false);

      await expect(
        service.signIn(email, password, ipAddress),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when user is inactive', async () => {
      const mockUser = createMockUser({ isActiveUser: jest.fn().mockReturnValue(false) });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (compareBcrypt as jest.Mock).mockResolvedValue(true);

      await expect(
        service.signIn(email, password, ipAddress),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('signUp', () => {
    const email = 'new@example.com';
    const password = 'SecurePass123!';

    it('should register new user and return auth token', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockAuthRepo.countByIdentifierAndChallengeType.mockResolvedValue(0);
      (generateOTP as jest.Mock).mockReturnValue('123456');
      (hashBcrypt as jest.Mock).mockResolvedValue('hashedValue');
      (generateSecureToken as jest.Mock).mockReturnValue('secure-auth-token');
      (md5 as jest.Mock).mockReturnValue('hashed-auth-token');
      mockAuthRepo.upsert.mockResolvedValue(createMockAuthChallenge());

      const result = await service.signUp(email, password);

      expect(result).toBe('secure-auth-token');
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(email);
      expect(mockAuthRepo.countByIdentifierAndChallengeType).toHaveBeenCalledWith(
        email,
        ChallengeType.SIGNUP,
      );
      expect(mockMailService.sendOtpEmail).toHaveBeenCalledWith(email, '123456');
      expect(hashBcrypt).toHaveBeenCalledTimes(2);
      expect(mockAuthRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          challengeType: ChallengeType.SIGNUP,
          identifierType: 'EMAIL',
          identifier: email,
        }),
      );
    });

    it('should throw ConflictException when user already exists and is active', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(createMockUser());

      await expect(service.signUp(email, password)).rejects.toThrow(ConflictException);
    });

    it('should throw HttpException when too many email attempts', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockAuthRepo.countByIdentifierAndChallengeType.mockResolvedValue(5);

      await expect(service.signUp(email, password)).rejects.toThrow(HttpException);
    });
  });

  describe('verifyOTP', () => {
    const token = 'auth-token';
    const otpCode = '123456';
    const ipAddress = '127.0.0.1';

    it('should verify OTP, create user, and return tokens', async () => {
      const mockChallenge = createMockAuthChallenge({
        verifiedAt: null,
        isUsed: false,
        createdAt: new Date(),
      });
      const mockUser = createMockUser();
      const mockSession = createMockSession();

      (md5 as jest.Mock).mockReturnValue('hashed-auth-token');
      mockAuthRepo.getByAuthToken.mockResolvedValue(mockChallenge);
      (compareBcrypt as jest.Mock).mockResolvedValue(true);
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(mockUser);
      (generateRefreshToken as jest.Mock).mockReturnValue('raw-refresh-token');
      (md5 as jest.Mock).mockReturnValue('hashed-refresh-token');
      mockSessionRepo.create.mockResolvedValue(mockSession);
      mockAuthRepo.upsert.mockResolvedValue(mockChallenge);

      const result = await service.verifyOTP(token, otpCode, ipAddress);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'raw-refresh-token',
        sessionId: mockSession.id,
        user: createExpectedUserProfile(mockUser),
      });
      expect(result.user).not.toHaveProperty('password');
      expect(mockUserRepo.create).toHaveBeenCalledWith({
        email: mockChallenge.identifier,
        password: mockChallenge.tempPassword,
      });
    });

    it('should throw BadRequestException when auth challenge not found', async () => {
      (md5 as jest.Mock).mockReturnValue('bad-hash');
      mockAuthRepo.getByAuthToken.mockResolvedValue(null);

      await expect(
        service.verifyOTP(token, otpCode, ipAddress),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when OTP already verified', async () => {
      const mockChallenge = createMockAuthChallenge({ verifiedAt: new Date() });
      (md5 as jest.Mock).mockReturnValue('some-hash');
      mockAuthRepo.getByAuthToken.mockResolvedValue(mockChallenge);

      await expect(
        service.verifyOTP(token, otpCode, ipAddress),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when OTP already used', async () => {
      const mockChallenge = createMockAuthChallenge({ isUsed: true });
      (md5 as jest.Mock).mockReturnValue('some-hash');
      mockAuthRepo.getByAuthToken.mockResolvedValue(mockChallenge);

      await expect(
        service.verifyOTP(token, otpCode, ipAddress),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when challenge expired', async () => {
      const mockChallenge = createMockAuthChallenge({
        expiredAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
      });
      (md5 as jest.Mock).mockReturnValue('some-hash');
      mockAuthRepo.getByAuthToken.mockResolvedValue(mockChallenge);

      await expect(
        service.verifyOTP(token, otpCode, ipAddress),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when OTP code is invalid', async () => {
      const mockChallenge = createMockAuthChallenge();
      (md5 as jest.Mock).mockReturnValue('some-hash');
      mockAuthRepo.getByAuthToken.mockResolvedValue(mockChallenge);
      (compareBcrypt as jest.Mock).mockResolvedValue(false);

      await expect(
        service.verifyOTP(token, otpCode, ipAddress),
      ).rejects.toThrow(BadRequestException);
      expect(mockAuthRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ attempts: 1 }),
      );
    });

    it('should create user when OTP is valid', async () => {
      const mockChallenge = createMockAuthChallenge();
      (md5 as jest.Mock).mockReturnValue('some-hash');
      mockAuthRepo.getByAuthToken.mockResolvedValue(mockChallenge);
      (compareBcrypt as jest.Mock).mockResolvedValue(true);
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(createMockUser());
      mockSessionRepo.create.mockResolvedValue(
        createMockSession({ id: 'session-123', userId: 'user-123' }),
      );

      const result = await service.verifyOTP(token, otpCode, ipAddress);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('sessionId');
    });
  });

  describe('resendOtp', () => {
    const token = 'auth-token';

    it('should resend OTP successfully', async () => {
      const mockChallenge = createMockAuthChallenge({
        verifiedAt: null,
        attempts: 0,
        createdAt: new Date(),
      });

      mockAuthRepo.getByAuthToken.mockResolvedValue(mockChallenge);
      (generateOTP as jest.Mock).mockReturnValue('654321');
      (hashBcrypt as jest.Mock).mockResolvedValue('new-hashed-otp');
      mockAuthRepo.upsert.mockResolvedValue(mockChallenge);

      await service.resendOtp(token);

      expect(mockMailService.sendOtpEmail).toHaveBeenCalledWith(
        mockChallenge.identifier,
        '654321',
      );
      expect(hashBcrypt).toHaveBeenCalledWith('654321');
      expect(mockAuthRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          challenge: 'new-hashed-otp',
          attempts: 1,
        }),
      );
    });

    it('should throw BadRequestException when challenge not found', async () => {
      mockAuthRepo.getByAuthToken.mockResolvedValue(null);

      await expect(service.resendOtp(token)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when already verified', async () => {
      const mockChallenge = createMockAuthChallenge({ verifiedAt: new Date() });
      mockAuthRepo.getByAuthToken.mockResolvedValue(mockChallenge);

      await expect(service.resendOtp(token)).rejects.toThrow(BadRequestException);
    });

    it('should throw HttpException for too many resend attempts', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago, within limit
      const mockChallenge = createMockAuthChallenge({
        attempts: 5,
        createdAt,
        verifiedAt: null,
      });
      mockAuthRepo.getByAuthToken.mockResolvedValue(mockChallenge);

      await expect(service.resendOtp(token)).rejects.toThrow(HttpException);
    });

    it('should reset attempts if elapsed exceeds resend limit', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 61 * 60 * 1000); // 61 min ago, exceeds limit
      const mockChallenge = createMockAuthChallenge({
        attempts: 5,
        createdAt,
        verifiedAt: null,
      });
      mockAuthRepo.getByAuthToken.mockResolvedValue(mockChallenge);
      (generateOTP as jest.Mock).mockReturnValue('654321');
      (hashBcrypt as jest.Mock).mockResolvedValue('new-hashed-otp');
      mockAuthRepo.upsert.mockResolvedValue(mockChallenge);

      await service.resendOtp(token);

      expect(mockAuthRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ attempts: 1 }),
      );
    });
  });

  describe('forgotPassword', () => {
    const email = 'test@example.com';

    it('should send forgot password OTP and return auth token', async () => {
      const mockUser = createMockUser();
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockAuthRepo.countByIdentifierAndChallengeType.mockResolvedValue(0);
      (generateSecureToken as jest.Mock).mockReturnValue('reset-auth-token');
      (generateOTP as jest.Mock).mockReturnValue('123456');
      (md5 as jest.Mock).mockReturnValue('hashed-reset-token');
      (hashBcrypt as jest.Mock).mockResolvedValue('hashed-otp');
      mockAuthRepo.upsert.mockResolvedValue(createMockAuthChallenge());

      const result = await service.forgotPassword(email);

      expect(result).toBe('reset-auth-token');
      expect(mockMailService.sendForgotPasswordEmail).toHaveBeenCalledWith(email, '123456');
      expect(mockAuthRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          challengeType: ChallengeType.FORGOT_PASSWORD,
          identifier: email,
        }),
      );
    });

    it('should return auth token even when user not found (silent)', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      (generateSecureToken as jest.Mock).mockReturnValue('silent-token');

      const result = await service.forgotPassword(email);

      expect(result).toBe('silent-token');
      expect(mockMailService.sendForgotPasswordEmail).not.toHaveBeenCalled();
    });

    it('should return auth token silently when user is inactive', async () => {
      const mockUser = createMockUser({ isActiveUser: jest.fn().mockReturnValue(false) });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (generateSecureToken as jest.Mock).mockReturnValue('silent-token');

      const result = await service.forgotPassword(email);

      expect(result).toBe('silent-token');
      expect(mockMailService.sendForgotPasswordEmail).not.toHaveBeenCalled();
    });
  });

  describe('verifyForgotPasswordOtp', () => {
    const authToken = 'auth-token';
    const otp = '123456';

    it('should verify forgot password OTP and return reset token', async () => {
      const mockChallenge = createMockAuthChallenge({
        challengeType: ChallengeType.FORGOT_PASSWORD,
        verifiedAt: null,
        isUsed: false,
      });
      (md5 as jest.Mock).mockReturnValue('hashed-token');
      mockAuthRepo.getByAuthToken.mockResolvedValue(mockChallenge);
      (compareBcrypt as jest.Mock).mockResolvedValue(true);
      (generateSecureToken as jest.Mock).mockReturnValue('reset-token');
      (md5 as jest.Mock).mockReturnValue('hashed-reset-token');
      mockAuthRepo.createPasswordReset.mockResolvedValue({});

      const result = await service.verifyForgotPasswordOtp(authToken, otp);

      expect(result).toBe('reset-token');
      expect(mockAuthRepo.createPasswordReset).toHaveBeenCalled();
    });

    it('should throw BadRequestException when OTP is invalid', async () => {
      const mockChallenge = createMockAuthChallenge({
        challengeType: ChallengeType.FORGOT_PASSWORD,
      });
      (md5 as jest.Mock).mockReturnValue('hashed-token');
      mockAuthRepo.getByAuthToken.mockResolvedValue(mockChallenge);
      (compareBcrypt as jest.Mock).mockResolvedValue(false);

      await expect(
        service.verifyForgotPasswordOtp(authToken, otp),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    const token = 'reset-token';
    const newPassword = 'NewSecurePass123!';
    const ipAddress = '127.0.0.1';

    it('should reset password and return new tokens', async () => {
      const mockUser = createMockUser({ password: 'oldHashedPassword' });
      const mockPasswordReset = {
        identifier: 'test@example.com',
        expiredAt: new Date(Date.now() + 3600000),
      };
      const mockSession = createMockSession();

      (md5 as jest.Mock).mockReturnValue('hashed-reset-token');
      mockAuthRepo.getPasswordReset.mockResolvedValue(mockPasswordReset);
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (compareBcrypt as jest.Mock).mockResolvedValue(false);
      (hashBcrypt as jest.Mock).mockResolvedValue('newHashedPassword');
      mockUserRepo.update.mockResolvedValue(undefined);
      mockSessionRepo.revokeAllByUserId.mockResolvedValue(undefined);
      (generateRefreshToken as jest.Mock).mockReturnValue('raw-refresh-token');
      (md5 as jest.Mock).mockReturnValue('hashed-refresh-token');
      mockSessionRepo.create.mockResolvedValue(mockSession);

      const result = await service.resetPassword(token, newPassword, ipAddress);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'raw-refresh-token',
        sessionId: mockSession.id,
        user: createExpectedUserProfile(mockUser),
      });
      expect(result.user).not.toHaveProperty('password');
      expect(mockUserRepo.update).toHaveBeenCalled();
      expect(mockSessionRepo.revokeAllByUserId).toHaveBeenCalledWith(mockUser.id);
      expect(mockAuditRepo.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.RESET_PASSWORD,
        resourceType: 'USER',
        resourceId: mockUser.id,
        ipAddress,
      });
    });

    it('should throw BadRequestException when reset token is invalid', async () => {
      (md5 as jest.Mock).mockReturnValue('bad-hash');
      mockAuthRepo.getPasswordReset.mockResolvedValue(null);

      await expect(
        service.resetPassword(token, newPassword, ipAddress),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reset token expired', async () => {
      mockAuthRepo.getPasswordReset.mockResolvedValue({
        identifier: 'test@example.com',
        expiredAt: new Date(Date.now() - 1000),
      });
      (md5 as jest.Mock).mockReturnValue('some-hash');

      await expect(
        service.resetPassword(token, newPassword, ipAddress),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user not found', async () => {
      const mockPasswordReset = {
        identifier: 'test@example.com',
        expiredAt: new Date(Date.now() + 3600000),
      };
      (md5 as jest.Mock).mockReturnValue('hashed-reset-token');
      mockAuthRepo.getPasswordReset.mockResolvedValue(mockPasswordReset);
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.resetPassword(token, newPassword, ipAddress),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new password is same as old', async () => {
      const mockUser = createMockUser();
      const mockPasswordReset = {
        identifier: 'test@example.com',
        expiredAt: new Date(Date.now() + 3600000),
      };
      (md5 as jest.Mock).mockReturnValue('hashed-reset-token');
      mockAuthRepo.getPasswordReset.mockResolvedValue(mockPasswordReset);
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (compareBcrypt as jest.Mock).mockResolvedValue(true);

      await expect(
        service.resetPassword(token, newPassword, ipAddress),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('googleLogin', () => {
    const googleProfile = {
      googleId: 'google-123',
      email: 'google@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };
    const ipAddress = '127.0.0.1';

    it('should login existing Google user', async () => {
      const mockUser = createMockUser({ email: googleProfile.email });
      const mockSession = createMockSession();
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (generateRefreshToken as jest.Mock).mockReturnValue('raw-refresh-token');
      (md5 as jest.Mock).mockReturnValue('hashed-refresh-token');
      mockSessionRepo.create.mockResolvedValue(mockSession);

      const result = await service.googleLogin(googleProfile, ipAddress);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'raw-refresh-token',
        sessionId: mockSession.id,
        user: createExpectedUserProfile(mockUser),
      });
      expect(result.user).not.toHaveProperty('password');
      expect(mockAuditRepo.create).toHaveBeenCalled();
    });

    it('should create new user and login for Google user', async () => {
      const mockUser = createMockUser({ email: googleProfile.email });
      const mockSession = createMockSession();
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(mockUser);
      (generateRefreshToken as jest.Mock).mockReturnValue('raw-refresh-token');
      (md5 as jest.Mock).mockReturnValue('hashed-refresh-token');
      mockSessionRepo.create.mockResolvedValue(mockSession);

      const result = await service.googleLogin(googleProfile, ipAddress);

      expect(result.accessToken).toBe('mock-access-token');
      expect(mockUserRepo.create).toHaveBeenCalledWith({ email: googleProfile.email });
    });

    it('should throw BadRequestException when user is inactive', async () => {
      const mockUser = createMockUser({
        email: googleProfile.email,
        isActiveUser: jest.fn().mockReturnValue(false),
      });
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      await expect(service.googleLogin(googleProfile, ipAddress)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('changePassword', () => {
    const userId = 'user-1';
    const sessionId = 'session-1';
    const oldPassword = 'oldPassword';
    const newPassword = 'newPassword';
    const ipAddress = '127.0.0.1';

    it('should change password successfully', async () => {
      const mockUser = createMockUser({ password: 'hashedOldPassword' });
      mockUserRepo.findById.mockResolvedValue(mockUser);
      (compareBcrypt as jest.Mock)
        .mockResolvedValueOnce(true)  // old password match
        .mockResolvedValueOnce(false); // new password different
      (hashBcrypt as jest.Mock).mockResolvedValue('hashedNewPassword');
      mockUserRepo.update.mockResolvedValue(undefined);
      mockSessionRepo.revokeAllByUserId.mockResolvedValue(undefined);
      mockAuditRepo.create.mockResolvedValue({});

      await service.changePassword(userId, sessionId, oldPassword, newPassword, ipAddress);

      expect(mockUserRepo.update).toHaveBeenCalled();
      expect(mockSessionRepo.revokeAllByUserId).toHaveBeenCalledWith(mockUser.id, [sessionId]);
      expect(mockAuditRepo.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.CHANGE_PASSWORD,
        resourceType: 'USER',
        resourceId: mockUser.id,
        ipAddress,
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(
        service.changePassword(userId, sessionId, oldPassword, newPassword, ipAddress),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when old password is incorrect', async () => {
      const mockUser = createMockUser();
      mockUserRepo.findById.mockResolvedValue(mockUser);
      (compareBcrypt as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(userId, sessionId, oldPassword, newPassword, ipAddress),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new password is same as old', async () => {
      const mockUser = createMockUser();
      mockUserRepo.findById.mockResolvedValue(mockUser);
      (compareBcrypt as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      await expect(
        service.changePassword(userId, sessionId, 'samePass', 'samePass', ipAddress),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('metaMaskChallenge', () => {
    const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38';

    it('should generate MetaMask challenge', async () => {
      const mockUser = createMockUser({ walletAddress });
      mockUserRepo.findByWalletAddress.mockResolvedValue(mockUser);
      (generateSecureToken as jest.Mock).mockReturnValue('challenge-nonce');
      mockAuthRepo.upsert.mockResolvedValue(createMockAuthChallenge());

      const result = await service.metaMaskChallenge(walletAddress);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('expiresAt');
      expect(result.message).toContain(walletAddress);
      expect(result.message).toContain('challenge-nonce');
    });

    it('should create challenge even when wallet not linked yet', async () => {
      mockUserRepo.findByWalletAddress.mockResolvedValue(null);
      (generateSecureToken as jest.Mock).mockReturnValue('challenge-nonce');
      mockAuthRepo.upsert.mockResolvedValue(createMockAuthChallenge());

      const result = await service.metaMaskChallenge(walletAddress);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('expiresAt');
      expect(result.message).toContain(walletAddress);
      expect(result.message).toContain('challenge-nonce');
    });
  });

  describe('metaMaskSignIn', () => {
    const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38';
    const ipAddress = '127.0.0.1';

    const buildTestMessage = (addr: string, nonce: string) =>
      `Welcome to AIOZ!\n\nClick to sign in and accept the AIOZ Terms of Service (https://aiozai.network/terms) and Privacy Policy (https://aiozai.network/privacy).\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nYour authentication status will reset after 24 hours.\n\nWallet address:\n${addr}\n\nNonce:\n${nonce}`;

    it('should sign in with MetaMask', async () => {
      const nonce = 'test-nonce';
      const message = buildTestMessage(walletAddress, nonce);
      const signature = '0xsignature';
      const mockChallenge = createMockAuthChallenge({
        identifier: walletAddress,
        expiredAt: new Date(Date.now() + 120000),
      });
      const mockSession = createMockSession();
      const mockUser = createMockUser({ walletAddress });

      mockAuthRepo.getByIdentifier.mockResolvedValue(mockChallenge);
      (recoverWalletAddress as jest.Mock).mockReturnValue(walletAddress);
      mockUserRepo.findByWalletAddress.mockResolvedValue(mockUser);
      (generateRefreshToken as jest.Mock).mockReturnValue('raw-refresh-token');
      (md5 as jest.Mock).mockReturnValue('hashed-refresh-token');
      mockSessionRepo.create.mockResolvedValue(mockSession);

      const result = await service.metaMaskSignIn(walletAddress, message, signature, ipAddress);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'raw-refresh-token',
        sessionId: mockSession.id,
        user: createExpectedUserProfile(mockUser),
      });
      expect(result.user).not.toHaveProperty('password');
      expect(mockAuditRepo.create).toHaveBeenCalled();
    });

    it('should create new wallet user if not exists', async () => {
      const nonce = 'test-nonce';
      const message = buildTestMessage(walletAddress, nonce);
      const signature = '0xsignature';
      const mockChallenge = createMockAuthChallenge({
        identifier: walletAddress,
        expiredAt: new Date(Date.now() + 120000),
      });
      const mockSession = createMockSession();
      const mockUser = createMockUser({ walletAddress });

      mockAuthRepo.getByIdentifier.mockResolvedValue(mockChallenge);
      (recoverWalletAddress as jest.Mock).mockReturnValue(walletAddress);
      mockUserRepo.findByWalletAddress.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(mockUser);
      (generateRefreshToken as jest.Mock).mockReturnValue('raw-refresh-token');
      (md5 as jest.Mock).mockReturnValue('hashed-refresh-token');
      mockSessionRepo.create.mockResolvedValue(mockSession);

      const result = await service.metaMaskSignIn(walletAddress, message, signature, ipAddress);

      expect(result.accessToken).toBe('mock-access-token');
      expect(mockUserRepo.create).toHaveBeenCalledWith({ walletAddress });
    });

    it('should throw UnauthorizedException when challenge not found', async () => {
      mockAuthRepo.getByIdentifier.mockResolvedValue(null);

      await expect(
        service.metaMaskSignIn(
          walletAddress,
          buildTestMessage(walletAddress, 'nonce'),
          '0xsig',
          ipAddress,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when challenge expired', async () => {
      const mockChallenge = createMockAuthChallenge({
        identifier: walletAddress,
        expiredAt: new Date(Date.now() - 1000),
      });
      mockAuthRepo.getByIdentifier.mockResolvedValue(mockChallenge);

      await expect(
        service.metaMaskSignIn(
          walletAddress,
          buildTestMessage(walletAddress, 'nonce'),
          '0xsig',
          ipAddress,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when signature is invalid', async () => {
      const nonce = 'test-nonce';
      const message = buildTestMessage(walletAddress, nonce);
      const mockChallenge = createMockAuthChallenge({
        identifier: walletAddress,
        expiredAt: new Date(Date.now() + 120000),
      });
      mockAuthRepo.getByIdentifier.mockResolvedValue(mockChallenge);
      (recoverWalletAddress as jest.Mock).mockReturnValue('0xDIFFERENT');

      await expect(
        service.metaMaskSignIn(walletAddress, message, '0xsig', ipAddress),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('linkWallet', () => {
    const userId = 'user-1';
    const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38';

    it('should create link wallet challenge', async () => {
      const mockUser = createMockUser({ walletAddress: null });
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockUserRepo.findByWalletAddress.mockResolvedValue(null);
      (generateSecureToken as jest.Mock).mockReturnValue('link-nonce');
      mockAuthRepo.upsert.mockResolvedValue(createMockAuthChallenge());

      const result = await service.linkWallet(userId, walletAddress);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('expiresAt');
      expect(result.message).toContain('Click to link your wallet');
    });

    it('should throw BadRequestException when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.linkWallet(userId, walletAddress)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when wallet already linked to user', async () => {
      const mockUser = createMockUser({ walletAddress: '0xExisting' });
      mockUserRepo.findById.mockResolvedValue(mockUser);

      await expect(service.linkWallet(userId, walletAddress)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when wallet already linked to another account', async () => {
      const mockUser = createMockUser({ walletAddress: null });
      const otherUser = createMockUser({ id: 'other-user' });
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockUserRepo.findByWalletAddress.mockResolvedValue(otherUser);

      await expect(service.linkWallet(userId, walletAddress)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyLinkWallet', () => {
    const userId = 'user-1';
    const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38';

    const buildLinkMessage = (addr: string, nonce: string) =>
      `Welcome to AIOZ!\n\nClick to link your wallet and accept the AIOZ Terms of Service (https://aiozai.network/terms) and Privacy Policy (https://aiozai.network/privacy).\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nYour authentication status will reset after 24 hours.\n\nWallet address:\n${addr}\n\nNonce:\n${nonce}`;

    it('should verify and link wallet successfully', async () => {
      const nonce = 'link-nonce';
      const message = buildLinkMessage(walletAddress, nonce);
      const signature = '0xsignature';
      const mockUser = createMockUser({ walletAddress: null });
      const mockChallenge = createMockAuthChallenge({
        identifier: walletAddress,
        expiredAt: new Date(Date.now() + 120000),
      });

      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockAuthRepo.getByIdentifier.mockResolvedValue(mockChallenge);
      (recoverWalletAddress as jest.Mock).mockReturnValue(walletAddress);
      mockUserRepo.update.mockResolvedValue(undefined);
      mockAuthRepo.upsert.mockResolvedValue(mockChallenge);

      await service.verifyLinkWallet(userId, message, signature);

      expect(mockUser.walletAddress).toBe(walletAddress);
      expect(mockUserRepo.update).toHaveBeenCalledWith(mockUser);
    });

    it('should throw BadRequestException when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(
        service.verifyLinkWallet(userId, 'message', '0xsig'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when challenge not found', async () => {
      const mockUser = createMockUser();
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockAuthRepo.getByIdentifier.mockResolvedValue(null);

      await expect(
        service.verifyLinkWallet(
          userId,
          buildLinkMessage(walletAddress, 'nonce'),
          '0xsig',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when challenge expired', async () => {
      const mockUser = createMockUser();
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockAuthRepo.getByIdentifier.mockResolvedValue(
        createMockAuthChallenge({
          identifier: walletAddress,
          expiredAt: new Date(Date.now() - 1000),
        }),
      );

      await expect(
        service.verifyLinkWallet(
          userId,
          buildLinkMessage(walletAddress, 'nonce'),
          '0xsig',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    const rawRefreshToken = 'raw-refresh-token';

    it('should return new access token', async () => {
      const mockSession = createMockSession({
        isRevoked: false,
        refreshedExpiredAt: new Date(Date.now() + 604800000),
      });
      (md5 as jest.Mock).mockReturnValue('hashed-refresh-token');
      mockSessionRepo.getByRefreshToken.mockResolvedValue(mockSession);
      mockSessionRepo.update.mockResolvedValue(undefined);

      const result = await service.refreshToken(rawRefreshToken);

      expect(result).toBe('mock-access-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockSession.userId,
        sessionId: mockSession.id,
      });
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockSession.id, lastUsedAt: expect.any(Date) }),
      );
    });

    it('should throw UnauthorizedException when session not found', async () => {
      (md5 as jest.Mock).mockReturnValue('bad-hash');
      mockSessionRepo.getByRefreshToken.mockResolvedValue(null);

      await expect(service.refreshToken(rawRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when session is revoked', async () => {
      const mockSession = createMockSession({
        isRevoked: true,
        refreshedExpiredAt: new Date(Date.now() + 604800000),
      });
      (md5 as jest.Mock).mockReturnValue('hashed-refresh-token');
      mockSessionRepo.getByRefreshToken.mockResolvedValue(mockSession);

      await expect(service.refreshToken(rawRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token expired', async () => {
      const mockSession = createMockSession({
        isRevoked: false,
        refreshedExpiredAt: new Date(Date.now() - 1000),
      });
      (md5 as jest.Mock).mockReturnValue('hashed-refresh-token');
      mockSessionRepo.getByRefreshToken.mockResolvedValue(mockSession);

      await expect(service.refreshToken(rawRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    const sessionId = 'session-1';

    it('should logout and delete session', async () => {
      const mockSession = createMockSession();
      mockSessionRepo.getById.mockResolvedValue(mockSession);
      mockSessionRepo.deleteById.mockResolvedValue(undefined);
      mockAuditRepo.create.mockResolvedValue({});

      await service.logout(sessionId);

      expect(mockSessionRepo.deleteById).toHaveBeenCalledWith(mockSession.id);
      expect(mockAuditRepo.create).toHaveBeenCalledWith({
        userId: mockSession.userId,
        action: AuditAction.LOGOUT,
        resourceType: 'SESSION',
        resourceId: mockSession.id,
        ipAddress: mockSession.ipAddress,
      });
    });

    it('should throw BadRequestException when session not found', async () => {
      mockSessionRepo.getById.mockResolvedValue(null);

      await expect(service.logout(sessionId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cleanUpExpiredChallenges', () => {
    it('should clean up expired challenges', async () => {
      mockAuthRepo.deleteExpiredChallenges.mockResolvedValue(undefined);
      mockAuthRepo.deletePasswordResetExpiredChallenges.mockResolvedValue(undefined);

      await service.cleanUpExpiredChallenges();

      expect(mockAuthRepo.deleteExpiredChallenges).toHaveBeenCalled();
      expect(mockAuthRepo.deletePasswordResetExpiredChallenges).toHaveBeenCalled();
    });
  });
});
