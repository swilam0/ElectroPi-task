import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = await super.canActivate(context);
    if (!result) return false;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.jti) {
      const blacklisted = await this.redisService.get(`blacklist:${user.jti}`);
      if (blacklisted) {
        throw new UnauthorizedException({
          status: 'error',
          message: 'Authentication required',
          code: 'A-001',
        });
      }
    }

    return true;
  }

  handleRequest<TUser = any>(err: any, user: TUser, _info: any, _context: ExecutionContext, _status?: any): TUser {
    if (err || !user) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Authentication required',
        code: 'A-001',
      });
    }
    return user;
  }
}
