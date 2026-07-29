import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly lockoutThreshold = 10;
  private readonly lockoutDurationMs = 15 * 60 * 1000;

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.authRepository.findByEmail(dto.email);

    if (existing) {
      return {
        message:
          'If the email is not already registered, an account has been created.',
      };
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    await this.authRepository.createUser(dto.email, hashedPassword, dto.name);

    return {
      message:
        'If the email is not already registered, an account has been created.',
    };
  }

  async login(email: string, password: string) {
    const user = await this.authRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Invalid credentials',
        code: 'A-004',
      });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Account temporarily locked',
        code: 'A-006',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      const newAttempts = user.failedLoginAttempts + 1;
      await this.authRepository.updateFailedAttempts(user.id, newAttempts);

      if (newAttempts >= this.lockoutThreshold) {
        const lockedUntil = new Date(Date.now() + this.lockoutDurationMs);
        await this.authRepository.setLockedUntil(user.id, lockedUntil);
      }

      throw new UnauthorizedException({
        status: 'error',
        message: 'Invalid credentials',
        code: 'A-004',
      });
    }

    await this.authRepository.updateFailedAttempts(user.id, 0);
    await this.authRepository.setLockedUntil(user.id, null);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: randomUUID(),
    });

    const refreshJti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: user.id, jti: refreshJti },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as any,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );

    await this.authRepository.createRefreshToken(
      user.id,
      refreshTokenHash,
      expiresAt,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }
}
