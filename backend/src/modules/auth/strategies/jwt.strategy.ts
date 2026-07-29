import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../../../redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: { sub: string; email: string; role: string; jti: string; exp: number }) {
    const blacklisted = await this.redisService.get(`blacklist:${payload.jti}`);
    if (blacklisted) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Authentication required',
        code: 'A-001',
      });
    }

    return { id: payload.sub, email: payload.email, role: payload.role, jti: payload.jti, exp: payload.exp };
  }
}
