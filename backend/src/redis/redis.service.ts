import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(configService: ConfigService) {
    super(configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379');

    this.on('connect', () => {
      this.logger.log('Redis connection established');
    });

    this.on('error', (err) => {
      this.logger.error('Redis connection error', err.message);
    });
  }

  async onModuleInit() {
    await this.ping();
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
