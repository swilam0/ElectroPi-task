import { execSync } from 'child_process';
import * as path from 'path';
import { config } from 'dotenv';

const envPath = path.resolve(__dirname, '../.env');
config({ path: envPath });

function getTestDbUrl(): string {
  const mainUrl = process.env.DATABASE_URL || 'postgresql://postgres:0000@localhost:5432/taskflow?schema=public';
  return mainUrl.replace('/taskflow?', '/taskflow_test?');
}

export default async function globalSetup() {
  const testDbUrl = getTestDbUrl();

  try {
    execSync('createdb taskflow_test 2>/dev/null || true', { shell: true, stdio: 'pipe' });
  } catch {
    // database may already exist
  }

  execSync(`DATABASE_URL="${testDbUrl}" npx prisma migrate deploy`, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    shell: true,
  });
}
