import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  PORT: number = 3001;

  @IsString()
  @MinLength(1)
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL: string = 'redis://localhost:6379';

  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsNumber()
  @Min(12)
  BCRYPT_SALT_ROUNDS: number = 12;

  @IsString()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsNumber()
  @Min(1)
  THROTTLE_TTL: number = 60000;

  @IsNumber()
  @Min(1)
  THROTTLE_LIMIT: number = 10;

  @IsOptional()
  @IsString()
  LOG_LEVEL: string = 'log';
}

export function validate(config: Record<string, unknown>) {
  const transformed = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(transformed, { skipMissingProperties: false });

  if (errors.length > 0) {
    const missing = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Environment validation failed: ${missing}`);
  }

  return transformed;
}
