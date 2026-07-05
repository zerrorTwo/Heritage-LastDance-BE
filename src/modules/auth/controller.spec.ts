import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './controller';
import { AuthService } from './service';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  password: 'hashedPassword',
  isActive: true,
  createdAt: new Date(),
  isActiveUser: () => true,
};

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  sessionId: 'session-1',
  user: mockUser,
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    signIn: jest.fn(),
    signUp: jest.fn(),
    verifyOTP: jest.fn(),
    resendOtp: jest.fn(),
    forgotPassword: jest.fn(),
    verifyForgotPasswordOtp: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    googleLogin: jest.fn(),
  };

  const mockResponse = () => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
    };
    return res;
  };

  const mockRequest = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'Mozilla/5.0 Test',
    },
    user: {
      userId: 'user-1',
      sessionId: 'session-1',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('signUp', () => {
    it('should call authService.signUp and return Created response', async () => {
      const dto = { email: 'new@example.com', password: 'SecurePass123!' };
      mockAuthService.signUp.mockResolvedValue('auth-token');

      const result = await controller.signUp(dto);

      expect(authService.signUp).toHaveBeenCalledWith(dto.email, dto.password);
      expect(result).toEqual({ data: { authToken: 'auth-token' } });
    });
  });

  describe('signIn', () => {
    it('should call authService.signIn and return OK response', async () => {
      const dto = { email: 'test@example.com', password: 'SecurePass123!' };
      mockAuthService.signIn.mockResolvedValue(mockTokens);

      const result = await controller.signIn(dto, mockRequest);

      expect(authService.signIn).toHaveBeenCalledWith(
        dto.email,
        dto.password,
        mockRequest.ip,
        mockRequest.headers['user-agent'],
      );
      expect(result).toEqual({ data: mockTokens });
    });
  });

  describe('verifyOtp', () => {
    it('should call authService.verifyOTP and return OK response', async () => {
      const dto = { token: 'auth-token', otpCode: '123456' };
      mockAuthService.verifyOTP.mockResolvedValue(mockTokens);

      const result = await controller.verifyOtp(dto, mockRequest);

      expect(authService.verifyOTP).toHaveBeenCalledWith(
        dto.token,
        dto.otpCode,
        mockRequest.ip,
        mockRequest.headers['user-agent'],
      );
      expect(result).toEqual({ data: mockTokens });
    });
  });

  describe('resendOtp', () => {
    it('should call authService.resendOtp and return OK response', async () => {
      const dto = { token: 'auth-token' };
      mockAuthService.resendOtp.mockResolvedValue(undefined);

      const result = await controller.resendOtp(dto);

      expect(authService.resendOtp).toHaveBeenCalledWith(dto.token);
      expect(result).toEqual({ data: { message: 'OTP resent successfully' } });
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword and return OK response', async () => {
      const dto = { email: 'test@example.com' };
      mockAuthService.forgotPassword.mockResolvedValue('reset-token');

      const result = await controller.forgotPassword(dto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(dto.email);
      expect(result).toEqual({ data: { resetToken: 'reset-token' } });
    });
  });

  describe('verifyForgotPasswordOtp', () => {
    it('should call authService.verifyForgotPasswordOtp and return OK response', async () => {
      const dto = { token: 'auth-token', otpCode: '123456' };
      mockAuthService.verifyForgotPasswordOtp.mockResolvedValue('reset-token');

      const result = await controller.verifyForgotPasswordOtp(dto);

      expect(authService.verifyForgotPasswordOtp).toHaveBeenCalledWith(dto.token, dto.otpCode);
      expect(result).toEqual({ data: { resetToken: 'reset-token' } });
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword and return OK response', async () => {
      const dto = { token: 'reset-token', newPassword: 'NewPass123!' };
      mockAuthService.resetPassword.mockResolvedValue(mockTokens);

      const result = await controller.resetPassword(dto, mockRequest);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        dto.token,
        dto.newPassword,
        mockRequest.ip,
        mockRequest.headers['user-agent'],
      );
      expect(result).toEqual({ data: mockTokens });
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword and return OK response', async () => {
      const dto = { oldPassword: 'OldPass123!', newPassword: 'NewPass123!' };
      mockAuthService.changePassword.mockResolvedValue(undefined);

      const result = await controller.changePassword(dto, mockRequest);

      expect(authService.changePassword).toHaveBeenCalledWith(
        mockRequest.user.userId,
        mockRequest.user.sessionId,
        dto.oldPassword,
        dto.newPassword,
        mockRequest.ip,
      );
      expect(result).toEqual({ data: { message: 'Password changed successfully' } });
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshToken and return OK response', async () => {
      const dto = { refreshToken: 'raw-refresh-token' };
      const res = mockResponse();
      mockAuthService.refreshToken.mockResolvedValue('mock-access-token');

      await controller.refreshToken(dto, mockRequest, res);

      expect(authService.refreshToken).toHaveBeenCalledWith(dto.refreshToken);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: { accessToken: 'mock-access-token' } });
    });
  });

  describe('logout', () => {
    it('should call authService.logout and return OK response', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const res = mockResponse();

      await controller.logout(mockRequest, res);

      expect(authService.logout).toHaveBeenCalledWith(mockRequest.user.sessionId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: { message: 'Logged out successfully' } });
    });
  });

  describe('googleCallback', () => {
    it('should call authService.googleLogin and return OK response', async () => {
      const googleProfile = {
        googleId: 'google-123',
        email: 'google@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      const googleReq = {
        user: googleProfile,
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
      };
      const res = mockResponse();
      mockAuthService.googleLogin.mockResolvedValue(mockTokens);

      await controller.googleCallback(googleReq, res);

      expect(authService.googleLogin).toHaveBeenCalledWith(
        googleProfile,
        googleReq.ip,
        googleReq.headers['user-agent'],
      );
      expect(res.redirect).toHaveBeenCalled();
    });
  });
});
