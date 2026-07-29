import { config } from 'dotenv';
import * as path from 'path';

// Load .env BEFORE any NestJS module decorators evaluate
config({ path: path.resolve(__dirname, '../.env') });

// Override with test-specific values
process.env.DATABASE_URL = (process.env.DATABASE_URL || 'postgresql://postgres:0000@localhost:5432/taskflow?schema=public')
  .replace('/taskflow?', '/taskflow_test?');
process.env.THROTTLE_LIMIT = '100000';
process.env.THROTTLE_TTL = '60000';
