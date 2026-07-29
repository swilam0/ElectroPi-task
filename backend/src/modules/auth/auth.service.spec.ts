import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../../redis/redis.service';
import { createMockRefreshToken, createMockUser } from '../../common/test/factories';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    authRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      createUser: jest.fn(),
      updateFailedAttempts: jest.fn(),
      setLockedUntil: jest.fn(),
      createRefreshToken: jest.fn(),
      findRefreshTokenByHash: jest.fn(),
      deleteRefreshToken: jest.fn(),
      deleteAllRefreshTokensForUser: jest.fn(),
    } as any;

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-token'),
      verify: jest.fn(),
    } as any;

    configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          BCRYPT_SALT_ROUNDS: 12,
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return config[key] ?? defaultValue;
      }),
    } as any;

    redisService = {
      set: jest.fn(),
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: authRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const dto: RegisterDto = {
      email: 'new@test.com',
      password: 'Password123!',
      name: 'New User',
    };

    it('should create a user and return generic message when email is new', async () => {
      authRepository.findByEmail.mockResolvedValue(null);
      authRepository.createUser.mockResolvedValue(createMockUser());

      const result = await service.register(dto);

      expect(authRepository.findByEmail).toHaveBeenCalledWith('new@test.com');
      expect(authRepository.createUser).toHaveBeenCalled();
      expect(result.message).toBe('If the email is not already registered, an account has been created.');
    });

    it('should return generic message when email already exists (anti-enumeration)', async () => {
      authRepository.findByEmail.mockResolvedValue(createMockUser());

      const result = await service.register(dto);

      expect(authRepository.createUser).not.toHaveBeenCalled();
      expect(result.message).toBe('If the email is not already registered, an account has been created.');
    });
  });

  describe('login', () => {
    const email = 'user@test.com';
    const password = 'Password123!';
    const user = createMockUser({ email, password: bcrypt.hashSync('Password123!', 12) });

    it('should return tokens for valid credentials', async () => {
      authRepository.findByEmail.mockResolvedValue(user);
      authRepository.updateFailedAttempts.mockResolvedValue(user as any);
      authRepository.setLockedUntil.mockResolvedValue(user as any);
      authRepository.createRefreshToken.mockResolvedValue(createMockRefreshToken());

      const result = await service.login(email, password);

      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.refreshToken).toBe('mocked-jwt-token');
      expect(result.user.email).toBe(email);
      expect(authRepository.updateFailedAttempts).toHaveBeenCalledWith(user.id, 0);
      expect(authRepository.setLockedUntil).toHaveBeenCalledWith(user.id, null);
    });

    it('should throw A-004 for non-existent email', async () => {
      authRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login('unknown@test.com', password)).rejects.toThrow(
        new UnauthorizedException({ status: 'error', message: 'Invalid credentials', code: 'A-004' }),
      );
    });

    it('should throw A-004 for wrong password', async () => {
      authRepository.findByEmail.mockResolvedValue(user);

      await expect(service.login(email, 'WrongPassword1')).rejects.toThrow(
        new UnauthorizedException({ status: 'error', message: 'Invalid credentials', code: 'A-004' }),
      );
    });

    it('should increment failed attempts on wrong password', async () => {
      authRepository.findByEmail.mockResolvedValue(user);

      await expect(service.login(email, 'WrongPassword1')).rejects.toThrow();

      expect(authRepository.updateFailedAttempts).toHaveBeenCalledWith(user.id, 1);
    });

    it('should lock account after 10 failed attempts', async () => {
      const nearlyLocked = createMockUser({
        email,
        password: bcrypt.hashSync('Password123!', 12),
        failedLoginAttempts: 9,
      });
      authRepository.findByEmail.mockResolvedValue(nearlyLocked);

      await expect(service.login(email, 'WrongPassword1')).rejects.toThrow();

      expect(authRepository.setLockedUntil).toHaveBeenCalledWith(nearlyLocked.id, expect.any(Date));
    });

    it('should throw A-006 (423) when account is locked', async () => {
      const lockedUser = createMockUser({
        email,
        password: bcrypt.hashSync('Password123!', 12),
        lockedUntil: new Date(Date.now() + 60 * 1000),
      });
      authRepository.findByEmail.mockResolvedValue(lockedUser);

      await expect(service.login(email, password)).rejects.toThrow(
        new HttpException({ status: 'error', message: 'Account temporarily locked', code: 'A-006' }, HttpStatus.LOCKED),
      );
    });
  });

  describe('refresh', () => {
    const refreshToken = 'valid-refresh-token';
    const payload = { sub: 'user-id', email: 'user@test.com', role: 'MEMBER', jti: 'jti-id' };
    const storedToken = createMockRefreshToken({ userId: payload.sub });

    it('should rotate tokens for a valid refresh token', async () => {
      jwtService.verify.mockReturnValue(payload);
      authRepository.findRefreshTokenByHash.mockResolvedValue(storedToken);
      authRepository.deleteRefreshToken.mockResolvedValue(storedToken as any);
      authRepository.createRefreshToken.mockResolvedValue(createMockRefreshToken());

      const result = await service.refresh(refreshToken);

      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.refreshToken).toBe('mocked-jwt-token');
      expect(authRepository.deleteRefreshToken).toHaveBeenCalledWith(storedToken.id);
      expect(authRepository.createRefreshToken).toHaveBeenCalled();
    });

    it('should throw A-008 for expired/invalid token', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('expired'); });

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        new UnauthorizedException({ status: 'error', message: 'Refresh token expired or invalid', code: 'A-008' }),
      );
    });

    it('should detect theft and invalidate all sessions (A-007)', async () => {
      jwtService.verify.mockReturnValue(payload);
      authRepository.findRefreshTokenByHash.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        new UnauthorizedException({ status: 'error', message: 'Refresh token revoked or reused', code: 'A-007' }),
      );

      expect(authRepository.deleteAllRefreshTokensForUser).toHaveBeenCalledWith(payload.sub);
    });
  });

  describe('logout', () => {
    it('should delete refresh token and blacklist access jti with computed TTL', async () => {
      const storedToken = createMockRefreshToken();
      authRepository.findRefreshTokenByHash.mockResolvedValue(storedToken);

      const now = Math.floor(Date.now() / 1000);
      const exp = now + 300;
      await service.logout('user-id', 'jti-123', 'refresh-token', exp);

      expect(authRepository.deleteRefreshToken).toHaveBeenCalledWith(storedToken.id);
      expect(redisService.set).toHaveBeenCalledWith(
        'blacklist:jti-123',
        '1',
        'EX',
        expect.any(Number),
      );
    });

    it('should still blacklist access jti even if refresh token not found', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue(null);

      const now = Math.floor(Date.now() / 1000);
      const exp = now + 300;
      await service.logout('user-id', 'jti-123', 'refresh-token', exp);

      expect(authRepository.deleteRefreshToken).not.toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('should return user profile', async () => {
      const user = createMockUser({ id: 'user-id', name: 'Test User' });
      authRepository.findById.mockResolvedValue(user);

      const result = await service.me('user-id');

      expect(result.id).toBe('user-id');
      expect(result.name).toBe('Test User');
      expect(result.email).toBe(user.email);
      expect(result.role).toBe(user.role);
      expect(result.createdAt).toBeDefined();
    });

    it('should throw A-001 when user not found', async () => {
      authRepository.findById.mockResolvedValue(null);

      await expect(service.me('unknown-id')).rejects.toThrow(
        new UnauthorizedException({ status: 'error', message: 'Authentication required', code: 'A-001' }),
      );
    });
  });
});
