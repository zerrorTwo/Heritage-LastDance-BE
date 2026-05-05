# Hướng Dẫn Implement Auth Service với NestJS

> Dựa trên phân tích từ Go implementation, tài liệu này hướng dẫn LLM build lại toàn bộ Auth Service bằng NestJS + TypeScript theo đúng business logic gốc.

---

## Mục Lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Cài đặt dependencies](#2-cài-đặt-dependencies)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Entities & DTOs](#4-entities--dtos)
5. [Repository layer](#5-repository-layer)
6. [Token & Utility helpers](#6-token--utility-helpers)
7. [Auth Service - từng method](#7-auth-service---từng-method)
8. [Auth Controller](#8-auth-controller)
9. [Guards & Middleware](#9-guards--middleware)
10. [Module wiring](#10-module-wiring)
11. [Biến môi trường](#11-biến-môi-trường)
12. [Business rules quan trọng](#12-business-rules-quan-trọng)

---

## 1. Tổng quan kiến trúc

Auth Service xử lý 4 nhóm chức năng chính:

| Nhóm            | Methods                                                                        |
| --------------- | ------------------------------------------------------------------------------ |
| Email/Password  | `signIn`, `signUp`, `verifyOTP`, `resendOTP`                                   |
| Mật khẩu        | `forgotPassword`, `verifyForgotPasswordOTP`, `resetPassword`, `changePassword` |
| MetaMask/Wallet | `metaMaskChallenge`, `metaMaskSignIn`, `linkWallet`, `verifyLinkWallet`        |
| Session         | `refreshToken`, `logout`, `cleanUpExpiredChallenges`                           |

### Luồng Sign Up

```
signUp(email, password)
  → checkUserExists
  → validateEmailAttempts (max 5 lần / email / type)
  → generateOTP(6 digits)
  → sendOTPEmail (goroutine → async)
  → hash OTP, hash password (temp)
  → tạo AuthChallenge, lưu DB
  → trả về authToken (raw, không hash)

verifyOTP(token, otpCode, ip, deviceInfo)
  → getValidAuthChallenge (check expiry, used, attempts)
  → bcrypt.Compare OTP
  → checkUserExists (lần 2, tránh race condition)
  → tạo User
  → tạo Session + AccessToken + RefreshToken
  → đánh dấu challenge IsUsed = true
  → trả về tokens + user
```

### Luồng MetaMask

```
metaMaskChallenge(walletAddress)
  → kiểm tra wallet đã liên kết account chưa (bắt buộc phải có)
  → tạo nonce ngẫu nhiên 16 chars
  → build message dạng plaintext
  → lưu AuthChallenge (TTL = 2 phút)
  → trả về message + expiresAt

metaMaskSignIn(walletAddress, message, signature)
  → parse message lấy walletAddress + nonce
  → lấy AuthChallenge từ DB theo walletAddress
  → kiểm tra chữ ký (recover address từ signature)
  → so sánh recovered address với walletAddress
  → tạo/lấy User
  → tạo Session + tokens
```

---

## 2. Cài đặt dependencies

```bash
npm install @nestjs/common @nestjs/core @nestjs/typeorm typeorm pg
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install bcrypt uuid crypto
npm install ethers             # recover MetaMask wallet address
npm install nodemailer         # gửi email
npm install @nestjs/schedule   # cron job cleanup

npm install -D @types/bcrypt @types/uuid @types/nodemailer @types/passport-jwt
```

---

## 3. Cấu trúc thư mục

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.repository.ts
│   ├── entities/
│   │   ├── auth-challenge.entity.ts
│   │   └── password-reset.entity.ts
│   ├── dto/
│   │   ├── sign-in.dto.ts
│   │   ├── sign-up.dto.ts
│   │   ├── verify-otp.dto.ts
│   │   ├── forgot-password.dto.ts
│   │   ├── reset-password.dto.ts
│   │   ├── change-password.dto.ts
│   │   └── metamask.dto.ts
│   └── interfaces/
│       └── auth.interface.ts
├── session/
│   ├── session.entity.ts
│   └── session.repository.ts
├── user/
│   ├── user.entity.ts
│   └── user.repository.ts
├── audit/
│   ├── audit-log.entity.ts
│   └── audit-log.repository.ts
└── common/
    ├── guards/
    │   └── jwt-auth.guard.ts
    └── utils/
        ├── token.util.ts
        ├── random.util.ts
        └── wallet.util.ts
```

---

## 4. Entities & DTOs

### 4.1 AuthChallenge Entity

```typescript
// auth/entities/auth-challenge.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum ChallengeType {
  SIGNUP = 'SIGNUP',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  WALLET = 'WALLET',
  WALLET_LINK = 'WALLET_LINK',
}

export enum IdentifierType {
  EMAIL = 'EMAIL',
  WALLET = 'WALLET',
}

@Entity('auth_challenges')
export class AuthChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  challengeType: string; // SIGNUP | FORGOT_PASSWORD | WALLET | WALLET_LINK

  @Column({ type: 'varchar' })
  identifierType: string; // EMAIL | WALLET

  @Column({ type: 'varchar' })
  identifier: string; // email hoặc walletAddress

  @Column({ type: 'text', nullable: true })
  tempPassword: string | null; // bcrypt hash của password tạm (chỉ dùng trong SIGNUP)

  @Column({ type: 'text' })
  challenge: string; // bcrypt hash của OTP hoặc nonce raw (MetaMask)

  @Column({ type: 'timestamptz' })
  expiredAt: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'varchar', nullable: true })
  authToken: string | null; // MD5 hash của token trả về client

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
```

### 4.2 PasswordReset Entity

```typescript
// auth/entities/password-reset.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('password_resets')
export class PasswordReset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  identifier: string; // email

  @Column({ type: 'timestamptz' })
  expiredAt: Date;

  @Column({ type: 'varchar' })
  resetToken: string; // MD5 hash

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
```

### 4.3 Session Entity

```typescript
// session/session.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar' })
  refreshTokenHash: string; // MD5 hash của refresh token

  @Column({ type: 'varchar' })
  ipAddress: string;

  @Column({ type: 'varchar', nullable: true })
  deviceInfo: string | null;

  @Column({ type: 'boolean', default: false })
  isRevoked: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'timestamptz' })
  expiredAt: Date; // session TTL

  @Column({ type: 'timestamptz' })
  refreshedExpiredAt: Date; // refresh token TTL (dài hơn)

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
```

### 4.4 DTOs

```typescript
// auth/dto/sign-in.dto.ts
export class SignInDto {
  email: string;
  password: string;
}

// auth/dto/sign-up.dto.ts
export class SignUpDto {
  email: string;
  password: string;
}

// auth/dto/verify-otp.dto.ts
export class VerifyOtpDto {
  token: string;
  otpCode: string;
}

// auth/dto/forgot-password.dto.ts
export class ForgotPasswordDto {
  email: string;
}

// auth/dto/reset-password.dto.ts
export class ResetPasswordDto {
  token: string;
  newPassword: string;
}

// auth/dto/change-password.dto.ts
export class ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

// auth/dto/metamask.dto.ts
export class MetaMaskChallengeDto {
  walletAddress: string;
}

export class MetaMaskSignInDto {
  walletAddress: string;
  message: string;
  signature: string;
}

export class LinkWalletDto {
  walletAddress: string;
}
```

### 4.5 Interfaces (Output types)

```typescript
// auth/interfaces/auth.interface.ts
export interface SignInOutput {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  user: any; // User entity
}

export interface SignUpOutput extends SignInOutput {}

export interface MetaMaskChallengeOutput {
  message: string;
  expiresAt: string; // RFC3339
}
```

---

## 5. Repository layer

### 5.1 AuthRepository

```typescript
// auth/auth.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AuthChallenge } from './entities/auth-challenge.entity';
import { PasswordReset } from './entities/password-reset.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(AuthChallenge)
    private readonly challengeRepo: Repository<AuthChallenge>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepo: Repository<PasswordReset>,
  ) {}

  async upsert(challenge: Partial<AuthChallenge>): Promise<AuthChallenge> {
    // Nếu có id thì update, không thì insert
    if (challenge.id) {
      await this.challengeRepo.update(challenge.id, challenge);
      return this.challengeRepo.findOneBy({ id: challenge.id });
    }
    return this.challengeRepo.save(challenge);
  }

  async getByAuthToken(authToken: string): Promise<AuthChallenge | null> {
    return this.challengeRepo.findOneBy({ authToken });
  }

  // Lấy theo identifier (email hoặc walletAddress) — dùng cho MetaMask
  async getByIdentifier(identifier: string): Promise<AuthChallenge | null> {
    return this.challengeRepo.findOne({
      where: { identifier },
      order: { createdAt: 'DESC' },
    });
  }

  async countByIdentifierAndChallengeType(
    identifier: string,
    challengeType: string,
  ): Promise<number> {
    return this.challengeRepo.count({ where: { identifier, challengeType } });
  }

  async deleteExpiredChallenges(): Promise<void> {
    await this.challengeRepo.delete({ expiredAt: LessThan(new Date()) });
  }

  async createPasswordReset(
    reset: Partial<PasswordReset>,
  ): Promise<PasswordReset> {
    return this.passwordResetRepo.save(reset);
  }

  async getPasswordReset(resetToken: string): Promise<PasswordReset | null> {
    return this.passwordResetRepo.findOneBy({ resetToken });
  }

  async deletePasswordResetExpiredChallenges(): Promise<void> {
    await this.passwordResetRepo.delete({ expiredAt: LessThan(new Date()) });
  }
}
```

### 5.2 SessionRepository

```typescript
// session/session.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, In, Repository } from 'typeorm';
import { Session } from './session.entity';

@Injectable()
export class SessionRepository {
  constructor(
    @InjectRepository(Session)
    private readonly repo: Repository<Session>,
  ) {}

  async create(session: Partial<Session>): Promise<Session> {
    return this.repo.save(session);
  }

  async getById(id: string): Promise<Session | null> {
    return this.repo.findOneBy({ id });
  }

  async getByRefreshToken(hash: string): Promise<Session | null> {
    return this.repo.findOneBy({ refreshTokenHash: hash });
  }

  async update(session: Partial<Session>): Promise<void> {
    await this.repo.update(session.id, session);
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  // excludeSessionIds: session hiện tại sẽ không bị revoke (dùng trong changePassword)
  async revokeAllByUserId(
    userId: string,
    excludeSessionIds?: string[],
  ): Promise<void> {
    const query = this.repo
      .createQueryBuilder()
      .update()
      .set({ isRevoked: true })
      .where('userId = :userId', { userId });

    if (excludeSessionIds?.length) {
      query.andWhere('id NOT IN (:...excludeSessionIds)', {
        excludeSessionIds,
      });
    }

    await query.execute();
  }
}
```

---

## 6. Token & Utility helpers

### 6.1 Token Utility

```typescript
// common/utils/token.util.ts
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export function hashTokenByMd5(token: string): string {
  return crypto.createHash('md5').update(token).digest('hex');
}

export async function createRefreshToken(length: number): Promise<{
  raw: string;
  hash: string;
}> {
  const raw = crypto.randomBytes(length).toString('hex');
  const hash = hashTokenByMd5(raw);
  return { raw, hash };
}
```

### 6.2 Random Utility

```typescript
// common/utils/random.util.ts
import * as crypto from 'crypto';

export function generateOTP(digits: number): string {
  // Tạo OTP số, đảm bảo đủ số chữ số
  const max = Math.pow(10, digits);
  const otp = crypto.randomInt(0, max);
  return otp.toString().padStart(digits, '0');
}

export function generateRandomString(length: number): string {
  return crypto.randomBytes(length).toString('hex');
}
```

### 6.3 Wallet Utility

```typescript
// common/utils/wallet.util.ts
import { ethers } from 'ethers';

// Recover địa chỉ ví từ message đã ký
export function recoverWalletAddress(
  message: string,
  signature: string,
): string {
  return ethers.verifyMessage(message, signature);
}
```

---

## 7. Auth Service - từng method

```typescript
// auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  TooManyRequestsException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ethers } from 'ethers';

import { AuthRepository } from './auth.repository';
import { SessionRepository } from '../session/session.repository';
import { UserRepository } from '../user/user.repository';
import { AuditLogRepository } from '../audit/audit-log.repository';
import { MailService } from '../common/mail/mail.service';

import { hashTokenByMd5, createRefreshToken } from '../common/utils/token.util';
import { generateOTP, generateRandomString } from '../common/utils/random.util';
import { recoverWalletAddress } from '../common/utils/wallet.util';

import {
  SignInOutput,
  SignUpOutput,
  MetaMaskChallengeOutput,
} from './interfaces/auth.interface';

// ── Constants (tương đương với Go vars) ──────────────────────────────────────
const OTP_EXPIRE_TTL_MS = 5 * 60 * 1000; // 5 phút
const OTP_RESEND_LIMIT_TTL_MS = 60 * 60 * 1000; // 1 giờ
const MAX_EMAIL_ATTEMPTS = 5;
const OTP_MAX_RESEND_ATTEMPTS = 5;
const RESET_PASSWORD_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 phút
const METAMASK_CHALLENGE_TTL_MS = 2 * 60 * 1000; // 2 phút

const CHALLENGE_TYPE = {
  SIGNUP: 'SIGNUP',
  FORGOT_PASSWORD: 'FORGOT_PASSWORD',
  WALLET_SIGNIN: 'WALLET',
  WALLET_LINK: 'WALLET_LINK',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authRepo: AuthRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly auditRepo: AuditLogRepository,
    // Inject từ config:
    private readonly sessionTtlMs: number, // e.g. 24h
    private readonly refreshTokenTtlMs: number, // e.g. 7d
  ) {}

  // ── 7.1 Sign In ────────────────────────────────────────────────────────────
  async signIn(
    email: string,
    password: string,
    ipAddress: string,
    deviceInfo?: string,
  ): Promise<SignInOutput> {
    // 1. Tìm user theo email
    const currentUser = await this.userRepo.findByEmail(email);
    if (!currentUser) {
      throw new UnauthorizedException('Invalid email or password!');
    }

    // 2. So sánh password
    const isMatch = await bcrypt.compare(password, currentUser.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password!');
    }

    // 3. Kiểm tra user active
    if (!currentUser.isActive()) {
      throw new BadRequestException('User is inactive.');
    }

    // 4. Tạo session
    const { raw: refreshToken, hash: refreshTokenHash } =
      await createRefreshToken(32);
    const now = new Date();

    const newSession = await this.sessionRepo.create({
      userId: currentUser.id,
      refreshTokenHash,
      ipAddress,
      deviceInfo: deviceInfo ?? null,
      expiredAt: new Date(now.getTime() + this.sessionTtlMs),
      refreshedExpiredAt: new Date(now.getTime() + this.refreshTokenTtlMs),
    });

    // 5. Tạo access token (JWT)
    const accessToken = this.createAccessToken(currentUser.id, newSession.id);

    // 6. Audit log
    await this.auditRepo.create({
      userId: currentUser.id,
      action: 'LOGIN',
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

  // ── 7.2 Sign Up ────────────────────────────────────────────────────────────
  // Trả về authToken (raw) để client dùng cho verify OTP
  async signUp(email: string, password: string): Promise<string> {
    // 1. Kiểm tra user tồn tại
    await this.checkUserNotExists(email);

    // 2. Validate số lần gửi email
    await this.validateEmailAttempts(email, CHALLENGE_TYPE.SIGNUP);

    // 3. Tạo OTP 6 số
    const otpCode = generateOTP(6);
    // Gửi email bất đồng bộ (không await, giống goroutine trong Go)
    this.mailService.sendSignUpOtp(email, otpCode).catch(console.error);

    // 4. Hash OTP & password
    const hashedOTP = await bcrypt.hash(otpCode, 10);
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Tạo authToken
    const authToken = generateRandomString(32);
    const authTokenHash = hashTokenByMd5(authToken);

    // 6. Upsert AuthChallenge
    const now = new Date();
    await this.authRepo.upsert({
      challengeType: CHALLENGE_TYPE.SIGNUP,
      identifierType: 'EMAIL',
      identifier: email,
      tempPassword: hashedPassword,
      challenge: hashedOTP,
      expiredAt: new Date(now.getTime() + OTP_EXPIRE_TTL_MS),
      attempts: 0,
      authToken: authTokenHash,
    });

    return authToken; // raw token trả về client
  }

  // ── 7.3 Verify OTP (hoàn thành đăng ký) ───────────────────────────────────
  async verifyOTP(
    token: string,
    otpCode: string,
    ipAddress: string,
    deviceInfo?: string,
  ): Promise<SignUpOutput> {
    const now = new Date();

    // 1. Lấy và validate AuthChallenge
    const authChallenge = await this.getValidAuthChallenge(token, now);

    // 2. So sánh OTP
    const isOtpValid = await bcrypt.compare(otpCode, authChallenge.challenge);
    if (!isOtpValid) {
      authChallenge.attempts += 1;
      await this.authRepo.upsert(authChallenge);
      throw new BadRequestException('Invalid or expired OTP code!');
    }

    // 3. Kiểm tra user chưa tồn tại (race condition guard)
    await this.checkUserNotExists(authChallenge.identifier);

    // 4. Tạo User (password đã được hash sẵn trong tempPassword)
    const currentUser = await this.userRepo.create({
      email: authChallenge.identifier,
      password: authChallenge.tempPassword,
    });

    // 5. Đánh dấu challenge verifiedAt
    authChallenge.verifiedAt = now;
    await this.authRepo.upsert(authChallenge);

    // 6. Tạo session
    const { raw: refreshToken, hash: refreshTokenHash } =
      await createRefreshToken(32);
    const session = await this.sessionRepo.create({
      userId: currentUser.id,
      refreshTokenHash,
      ipAddress,
      deviceInfo: deviceInfo ?? null,
      expiredAt: new Date(now.getTime() + this.sessionTtlMs),
      refreshedExpiredAt: new Date(now.getTime() + this.refreshTokenTtlMs),
    });

    const accessToken = this.createAccessToken(currentUser.id, session.id);

    // 7. Đánh dấu challenge isUsed = true (tách riêng, giống Go)
    authChallenge.isUsed = true;
    await this.authRepo.upsert(authChallenge);

    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
      user: currentUser,
    };
  }

  // ── 7.4 Resend OTP ─────────────────────────────────────────────────────────
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
    this.validateAttempts(authChallenge, now); // throw nếu quá giới hạn

    // Tạo OTP mới
    const otpCode = generateOTP(6);
    this.mailService
      .sendSignUpOtp(authChallenge.identifier, otpCode)
      .catch(console.error);

    const hashedOTP = await bcrypt.hash(otpCode, 10);

    authChallenge.attempts += 1;
    authChallenge.expiredAt = new Date(now.getTime() + OTP_EXPIRE_TTL_MS);
    authChallenge.challenge = hashedOTP;

    await this.authRepo.upsert(authChallenge);
  }

  // ── 7.5 Forgot Password ────────────────────────────────────────────────────
  // Luôn trả về authToken dù email không tồn tại (chống user enumeration)
  async forgotPassword(email: string): Promise<string> {
    const authToken = generateRandomString(32);

    const currentUser = await this.userRepo.findByEmail(email);
    if (!currentUser) {
      // Trả về token giả để không lộ email có tồn tại không
      return authToken;
    }

    if (!currentUser.isActive()) {
      throw new BadRequestException('User is inactive!');
    }

    await this.validateEmailAttempts(email, CHALLENGE_TYPE.FORGOT_PASSWORD);

    const otpCode = generateOTP(6);
    this.mailService.sendForgotPasswordOtp(email, otpCode).catch(console.error);

    const hashedOTP = await bcrypt.hash(otpCode, 10);
    const authTokenHash = hashTokenByMd5(authToken);
    const now = new Date();

    await this.authRepo.upsert({
      challengeType: CHALLENGE_TYPE.FORGOT_PASSWORD,
      identifierType: 'EMAIL',
      identifier: email,
      tempPassword: null,
      challenge: hashedOTP,
      expiredAt: new Date(now.getTime() + OTP_EXPIRE_TTL_MS),
      attempts: 0,
      authToken: authTokenHash,
    });

    return authToken;
  }

  // ── 7.6 Verify Forgot Password OTP ────────────────────────────────────────
  async verifyForgotPasswordOtp(
    authToken: string,
    otp: string,
  ): Promise<string> {
    const now = new Date();
    const authChallenge = await this.getValidAuthChallenge(authToken, now);

    const isOtpValid = await bcrypt.compare(otp, authChallenge.challenge);
    if (!isOtpValid) {
      throw new BadRequestException('Invalid or expired OTP code!');
    }

    authChallenge.verifiedAt = now;

    // Tạo reset password token
    const resetPwdToken = generateRandomString(32);
    const resetPwdTokenHash = hashTokenByMd5(resetPwdToken);

    await this.authRepo.createPasswordReset({
      identifier: authChallenge.identifier,
      expiredAt: new Date(now.getTime() + RESET_PASSWORD_TOKEN_TTL_MS),
      resetToken: resetPwdTokenHash,
    });

    return resetPwdToken; // raw token
  }

  // ── 7.7 Reset Password ─────────────────────────────────────────────────────
  async resetPassword(
    token: string,
    newPassword: string,
    ipAddress: string,
    deviceInfo?: string,
  ): Promise<SignInOutput> {
    // 1. Validate reset token
    const passwordReset = await this.getValidPasswordReset(token);

    // 2. Lấy user
    const currentUser = await this.userRepo.findByEmail(
      passwordReset.identifier,
    );
    if (!currentUser) {
      throw new BadRequestException('User not found!');
    }

    // 3. Kiểm tra mật khẩu mới ≠ mật khẩu cũ
    const isSame = await bcrypt.compare(newPassword, currentUser.password);
    if (isSame) {
      throw new BadRequestException(
        'New password must be different from the old password!',
      );
    }

    // 4. Hash & cập nhật password
    currentUser.password = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(currentUser);

    // 5. Revoke TẤT CẢ session (không có exclude)
    await this.sessionRepo.revokeAllByUserId(currentUser.id);

    // 6. Tạo session mới
    const now = new Date();
    const { raw: refreshToken, hash: refreshTokenHash } =
      await createRefreshToken(32);
    const newSession = await this.sessionRepo.create({
      userId: currentUser.id,
      refreshTokenHash,
      ipAddress,
      deviceInfo: deviceInfo ?? null,
      expiredAt: new Date(now.getTime() + this.sessionTtlMs),
      refreshedExpiredAt: new Date(now.getTime() + this.refreshTokenTtlMs),
    });

    const accessToken = this.createAccessToken(currentUser.id, newSession.id);

    // 7. Audit log
    await this.auditRepo.create({
      userId: currentUser.id,
      action: 'RESET_PASSWORD',
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

  // ── 7.8 Change Password ────────────────────────────────────────────────────
  async changePassword(
    userId: string,
    sessionId: string,
    oldPassword: string,
    newPassword: string,
    ipAddress: string,
  ): Promise<void> {
    const currentUser = await this.userRepo.findById(userId);
    if (!currentUser) throw new BadRequestException('User not found!');

    // Kiểm tra mật khẩu cũ đúng không
    const isOldCorrect = await bcrypt.compare(
      oldPassword,
      currentUser.password,
    );
    if (!isOldCorrect) {
      throw new BadRequestException('Current password is incorrect!');
    }

    // Kiểm tra mật khẩu mới ≠ cũ
    const isSame = await bcrypt.compare(newPassword, currentUser.password);
    if (isSame) {
      throw new BadRequestException(
        'New password must be different from the old password!',
      );
    }

    currentUser.password = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(currentUser);

    // Revoke tất cả session NGOẠI TRỪ session hiện tại
    await this.sessionRepo.revokeAllByUserId(currentUser.id, [sessionId]);

    await this.auditRepo.create({
      userId: currentUser.id,
      action: 'CHANGE_PASSWORD',
      resourceType: 'USER',
      resourceId: currentUser.id,
      ipAddress,
    });
  }

  // ── 7.9 MetaMask Challenge ─────────────────────────────────────────────────
  async metaMaskChallenge(
    walletAddress: string,
  ): Promise<MetaMaskChallengeOutput> {
    // Wallet phải đã liên kết với 1 account
    const existUser = await this.userRepo.findByWalletAddress(walletAddress);
    if (!existUser) {
      throw new BadRequestException(
        'Wallet is not linked to any active account!',
      );
    }

    const nonce = generateRandomString(16);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + METAMASK_CHALLENGE_TTL_MS);

    await this.authRepo.upsert({
      challengeType: CHALLENGE_TYPE.WALLET_SIGNIN,
      identifierType: 'WALLET',
      identifier: walletAddress,
      tempPassword: null,
      challenge: nonce, // raw nonce (không hash, vì cần nhúng vào message)
      expiredAt: expiresAt,
      attempts: 0,
      authToken: '',
    });

    const message = this.buildMetaMaskMessage(walletAddress, nonce, false);

    return { message, expiresAt: expiresAt.toISOString() };
  }

  // ── 7.10 MetaMask Sign In ──────────────────────────────────────────────────
  async metaMaskSignIn(
    walletAddress: string,
    message: string,
    signature: string,
    ipAddress: string,
    deviceInfo?: string,
  ): Promise<SignInOutput> {
    const now = new Date();

    // 1. Parse message lấy walletAddress + nonce
    const parsed = this.parseMetaMaskMessage(message);

    // 2. Lấy challenge từ DB
    const authChallenge = await this.authRepo.getByIdentifier(
      parsed.walletAddress,
    );
    if (!authChallenge) {
      throw new UnauthorizedException('Invalid meta mask challenge!');
    }

    // 3. Kiểm tra địa chỉ khớp
    if (
      parsed.walletAddress.toLowerCase() !==
      authChallenge.identifier.toLowerCase()
    ) {
      throw new UnauthorizedException('Invalid meta mask challenge!');
    }

    // 4. Kiểm tra hết hạn
    if (now > authChallenge.expiredAt) {
      throw new UnauthorizedException('Meta mask challenge expired!');
    }

    // 5. Verify chữ ký — recover address từ message + signature
    const recoveredAddress = recoverWalletAddress(message, signature);
    if (recoveredAddress.toLowerCase() !== parsed.walletAddress.toLowerCase()) {
      throw new UnauthorizedException('Invalid meta mask signature!');
    }

    // 6. Tạo hoặc lấy user
    const currentUser = await this.createOrGetWalletUser(
      authChallenge.identifier,
    );

    // 7. Cập nhật challenge
    authChallenge.verifiedAt = now;
    await this.authRepo.upsert(authChallenge);

    // 8. Tạo session
    const { raw: refreshToken, hash: refreshTokenHash } =
      await createRefreshToken(32);
    const newSession = await this.sessionRepo.create({
      userId: currentUser.id,
      refreshTokenHash,
      ipAddress,
      deviceInfo: deviceInfo ?? null,
      expiredAt: new Date(now.getTime() + this.sessionTtlMs),
      refreshedExpiredAt: new Date(now.getTime() + this.refreshTokenTtlMs),
    });

    const accessToken = this.createAccessToken(currentUser.id, newSession.id);

    await this.auditRepo.create({
      userId: currentUser.id,
      action: 'LOGIN',
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

  // ── 7.11 Link Wallet ───────────────────────────────────────────────────────
  async linkWallet(
    userId: string,
    walletAddress: string,
  ): Promise<MetaMaskChallengeOutput> {
    const currentUser = await this.userRepo.findById(userId);
    if (!currentUser) throw new BadRequestException('User not found!');

    if (currentUser.walletAddress) {
      throw new BadRequestException('Wallet already linked!');
    }

    // Kiểm tra wallet chưa được dùng bởi account khác
    const existWalletUser =
      await this.userRepo.findByWalletAddress(walletAddress);
    if (existWalletUser) {
      throw new BadRequestException(
        'Wallet already linked to another account!',
      );
    }

    const nonce = generateRandomString(16);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + METAMASK_CHALLENGE_TTL_MS);

    await this.authRepo.upsert({
      challengeType: CHALLENGE_TYPE.WALLET_LINK,
      identifierType: 'WALLET',
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

  // ── 7.12 Verify Link Wallet ────────────────────────────────────────────────
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

  // ── 7.13 Refresh Token ─────────────────────────────────────────────────────
  async refreshToken(rawRefreshToken: string): Promise<string> {
    const { userId, sessionId } =
      await this.checkUserAuthorization(rawRefreshToken);
    return this.createAccessToken(userId, sessionId);
  }

  // ── 7.14 Logout ────────────────────────────────────────────────────────────
  async logout(sessionId: string): Promise<void> {
    const session = await this.sessionRepo.getById(sessionId);
    if (!session) throw new BadRequestException('Invalid session!');

    await this.sessionRepo.deleteById(session.id);

    await this.auditRepo.create({
      userId: session.userId,
      action: 'LOGOUT',
      resourceType: 'SESSION',
      resourceId: session.id,
      ipAddress: session.ipAddress,
    });
  }

  // ── 7.15 CleanUp (Cron job) ────────────────────────────────────────────────
  async cleanUpExpiredChallenges(): Promise<void> {
    await this.authRepo.deleteExpiredChallenges();
    await this.authRepo.deletePasswordResetExpiredChallenges();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────────────────────

  private createAccessToken(userId: string, sessionId: string): string {
    return this.jwtService.sign({ sub: userId, sessionId });
  }

  private async checkUserNotExists(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (user?.isActive()) {
      throw new ConflictException('User already exists!');
    }
  }

  private validateAttempts(authChallenge: any, now: Date): void {
    const elapsed = now.getTime() - new Date(authChallenge.createdAt).getTime();

    if (
      authChallenge.attempts >= OTP_MAX_RESEND_ATTEMPTS &&
      elapsed <= OTP_RESEND_LIMIT_TTL_MS
    ) {
      throw new TooManyRequestsException(
        'Too many OTP resend attempts, please try again later.',
      );
    }

    // Reset counter sau 1 giờ
    if (elapsed > OTP_RESEND_LIMIT_TTL_MS) {
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
    if (count >= MAX_EMAIL_ATTEMPTS) {
      throw new TooManyRequestsException(
        'Too many OTP resend attempts, please try again later.',
      );
    }
  }

  private async getValidAuthChallenge(token: string, now: Date): Promise<any> {
    const hash = hashTokenByMd5(token);
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
    const hash = hashTokenByMd5(resetToken);
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
      if (!existUser.isActive())
        throw new BadRequestException('User is inactive!');
      return existUser;
    }

    // Tạo user mới chỉ có walletAddress (không có email/password)
    try {
      return await this.userRepo.create({ walletAddress });
    } catch (err) {
      // Handle duplicate key (race condition)
      if (err.code === '23505') {
        return this.userRepo.findByWalletAddress(walletAddress);
      }
      throw err;
    }
  }

  private async checkUserAuthorization(
    rawRefreshToken: string,
  ): Promise<{ userId: string; sessionId: string }> {
    const hash = hashTokenByMd5(rawRefreshToken);
    const session = await this.sessionRepo.getByRefreshToken(hash);

    if (!session) throw new UnauthorizedException('Session not found!');
    if (session.isRevoked)
      throw new UnauthorizedException('Session is revoked!');
    if (new Date() > session.refreshedExpiredAt) {
      throw new UnauthorizedException('Refresh token expired!');
    }

    // Cập nhật lastUsedAt
    await this.sessionRepo.update({ id: session.id, lastUsedAt: new Date() });

    return { userId: session.userId, sessionId: session.id };
  }
}
```

---

## 8. Auth Controller

```typescript
// auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() body: any, @Req() req: any) {
    return this.authService.signIn(
      body.email,
      body.password,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('signup')
  signUp(@Body() body: any) {
    return this.authService.signUp(body.email, body.password);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() body: any, @Req() req: any) {
    return this.authService.verifyOTP(
      body.token,
      body.otpCode,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  resendOtp(@Body() body: any) {
    return this.authService.resendOtp(body.token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: any) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('verify-forgot-password-otp')
  @HttpCode(HttpStatus.OK)
  verifyForgotPasswordOtp(@Body() body: any) {
    return this.authService.verifyForgotPasswordOtp(body.token, body.otpCode);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: any, @Req() req: any) {
    return this.authService.resetPassword(
      body.token,
      body.newPassword,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  changePassword(@Body() body: any, @Req() req: any) {
    return this.authService.changePassword(
      req.user.userId,
      req.user.sessionId,
      body.oldPassword,
      body.newPassword,
      req.ip,
    );
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  refreshToken(@Body() body: any) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: any) {
    return this.authService.logout(req.user.sessionId);
  }

  // ── MetaMask ───────────────────────────────────────────────────────────────

  @Post('metamask/challenge')
  metaMaskChallenge(@Body() body: any) {
    return this.authService.metaMaskChallenge(body.walletAddress);
  }

  @Post('metamask/signin')
  @HttpCode(HttpStatus.OK)
  metaMaskSignIn(@Body() body: any, @Req() req: any) {
    return this.authService.metaMaskSignIn(
      body.walletAddress,
      body.message,
      body.signature,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('metamask/link')
  @UseGuards(JwtAuthGuard)
  linkWallet(@Body() body: any, @Req() req: any) {
    return this.authService.linkWallet(req.user.userId, body.walletAddress);
  }

  @Post('metamask/verify-link')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  verifyLinkWallet(@Body() body: any, @Req() req: any) {
    return this.authService.verifyLinkWallet(
      req.user.userId,
      body.message,
      body.signature,
    );
  }
}
```

---

## 9. Guards & Middleware

### JWT Guard

```typescript
// common/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### JWT Strategy

```typescript
// common/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // payload.sub = userId, payload.sessionId
    return { userId: payload.sub, sessionId: payload.sessionId };
  }
}
```

---

## 10. Module wiring

```typescript
// auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { AuthChallenge } from './entities/auth-challenge.entity';
import { PasswordReset } from './entities/password-reset.entity';

import { Session } from '../session/session.entity';
import { SessionRepository } from '../session/session.repository';

import { User } from '../user/user.entity';
import { UserRepository } from '../user/user.repository';

import { AuditLog } from '../audit/audit-log.entity';
import { AuditLogRepository } from '../audit/audit-log.repository';

import { MailService } from '../common/mail/mail.service';
import { JwtStrategy } from '../common/strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      AuthChallenge,
      PasswordReset,
      Session,
      User,
      AuditLog,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '1h') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    SessionRepository,
    UserRepository,
    AuditLogRepository,
    MailService,
    JwtStrategy,
    // Inject TTL từ config
    {
      provide: 'SESSION_TTL_MS',
      useFactory: (config: ConfigService) =>
        parseInt(config.get('SESSION_TTL_HOURS', '24')) * 3600 * 1000,
      inject: [ConfigService],
    },
    {
      provide: 'REFRESH_TOKEN_TTL_MS',
      useFactory: (config: ConfigService) =>
        parseInt(config.get('REFRESH_TOKEN_TTL_DAYS', '7')) * 86400 * 1000,
      inject: [ConfigService],
    },
  ],
})
export class AuthModule {}
```

### Cron job cleanup

```typescript
// auth/auth.cron.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from './auth.service';

@Injectable()
export class AuthCron {
  constructor(private readonly authService: AuthService) {}

  // Chạy mỗi ngày lúc 2 giờ sáng
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanUpExpiredChallenges() {
    await this.authService.cleanUpExpiredChallenges();
  }
}
```

---

## 11. Biến môi trường

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aioz_map

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=1h

# Session
SESSION_TTL_HOURS=24
REFRESH_TOKEN_TTL_DAYS=7

# Email
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=noreply@example.com
MAIL_PASS=your-password
MAIL_FROM=AIOZ <noreply@example.com>
```

---

## 12. Business rules quan trọng

Đây là các rule cốt lõi cần đảm bảo đúng, không được bỏ sót:

**Bảo mật token**

- Refresh token và authToken được lưu DB dưới dạng **MD5 hash**, không bao giờ lưu raw
- OTP được lưu dưới dạng **bcrypt hash** (cost 10)
- Access token là **JWT** ngắn hạn (1h), không lưu DB

**OTP & Rate limiting**

- OTP hết hạn sau **5 phút**
- Tối đa **5 lần resend** trong vòng **1 giờ**; sau 1 giờ counter tự reset
- Tối đa **5 lần gửi email** / email / challenge type (SIGNUP hoặc FORGOT_PASSWORD tính riêng)
- Mỗi lần OTP sai, tăng `attempts` và lưu lại DB ngay lập tức

**MetaMask**

- Challenge TTL chỉ **2 phút** (ngắn hơn OTP)
- Nonce lưu **raw** (không hash) vì cần nhúng vào message
- So sánh địa chỉ ví phải **case-insensitive** (`toLowerCase()`)
- `metaMaskChallenge` yêu cầu wallet **đã liên kết** trước; `linkWallet` yêu cầu wallet **chưa liên kết**

**Session**

- `resetPassword` revoke **tất cả** session của user (không có exception)
- `changePassword` revoke **tất cả ngoại trừ session hiện tại**
- Mỗi lần dùng refresh token cập nhật `lastUsedAt`

**Race conditions**

- `verifyOTP` gọi `checkUserExists` lần thứ 2 sau khi OTP hợp lệ (tránh tạo user trùng)
- `createOrGetWalletUser` bắt `duplicate key error (23505)` và retry get

**Email bất đồng bộ**

- `sendOTPEmail` và `sendForgotPasswordEmail` phải chạy **không block** luồng chính (dùng `.catch()` thay vì `await`)

**Anti-enumeration**

- `forgotPassword` luôn trả về authToken dù email không tồn tại — không để lộ email có trong hệ thống không
