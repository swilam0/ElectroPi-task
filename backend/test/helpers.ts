import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

config({ path: require('path').resolve(__dirname, '../.env') });

function getTestDbUrl(): string {
  const mainUrl = process.env.DATABASE_URL || 'postgresql://postgres:0000@localhost:5432/taskflow?schema=public';
  return mainUrl.replace('/taskflow?', '/taskflow_test?');
}

export function setTestEnv(): void {
  process.env.DATABASE_URL = getTestDbUrl();
}

export async function createTestApp(): Promise<INestApplication> {
  setTestEnv();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe());
  await app.init();
  return app;
}

let cachedHash: string | null = null;

export async function seedDatabase(prisma: PrismaService): Promise<void> {
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  if (!cachedHash) {
    cachedHash = await bcrypt.hash('Password123!', 12);
  }

  const alice = await prisma.user.create({
    data: { email: 'admin@taskflow.com', password: cachedHash, name: 'Alice Admin', role: 'ADMIN' },
  });
  const bob = await prisma.user.create({
    data: { email: 'bob@taskflow.com', password: cachedHash, name: 'Bob Builder', role: 'MEMBER' },
  });
  const carol = await prisma.user.create({
    data: { email: 'carol@taskflow.com', password: cachedHash, name: 'Carol Coder', role: 'MEMBER' },
  });

  const website = await prisma.project.create({
    data: { title: 'Website Redesign', description: 'Company website overhaul.', createdById: alice.id },
  });
  const mobileApp = await prisma.project.create({
    data: { title: 'Mobile App MVP', description: 'Mobile app MVP.', createdById: bob.id },
  });

  await prisma.projectMember.createMany({
    data: [
      { userId: alice.id, projectId: website.id },
      { userId: bob.id, projectId: website.id },
      { userId: carol.id, projectId: website.id },
      { userId: bob.id, projectId: mobileApp.id },
      { userId: alice.id, projectId: mobileApp.id },
    ],
  });

  await prisma.task.create({
    data: { title: 'Design homepage mockup', description: 'Create wireframes and mockups.', status: 'TODO', priority: 'HIGH', dueDate: new Date('2026-08-15'), projectId: website.id, createdById: alice.id, assigneeId: carol.id },
  });
  await prisma.task.create({
    data: { title: 'Implement auth flow', description: 'Add JWT auth.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date('2026-08-10'), projectId: website.id, createdById: alice.id, assigneeId: bob.id },
  });
  await prisma.task.create({
    data: { title: 'Set up CI/CD pipeline', description: 'Configure CI/CD.', status: 'DONE', priority: 'MEDIUM', dueDate: new Date('2026-07-25'), projectId: website.id, createdById: alice.id, assigneeId: bob.id },
  });
  await prisma.task.create({
    data: { title: 'API endpoint for user profiles', description: 'Implement user profile API.', status: 'TODO', priority: 'MEDIUM', dueDate: new Date('2026-09-01'), projectId: mobileApp.id, createdById: bob.id, assigneeId: null },
  });
  await prisma.task.create({
    data: { title: 'Push notification integration', description: 'Integrate push notifications.', status: 'IN_PROGRESS', priority: 'LOW', dueDate: new Date('2026-09-15'), projectId: mobileApp.id, createdById: bob.id, assigneeId: bob.id },
  });
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;
  accessToken: string;
  refreshToken: string;
}

export async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<UserSession> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    id: res.body.data.user.id,
    email: res.body.data.user.email,
    name: res.body.data.user.name,
    role: res.body.data.user.role,
    accessToken: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
  };
}

export async function loginAsAdmin(app: INestApplication): Promise<UserSession> {
  return login(app, 'admin@taskflow.com', 'Password123!');
}

export async function loginAsBob(app: INestApplication): Promise<UserSession> {
  return login(app, 'bob@taskflow.com', 'Password123!');
}

export async function loginAsCarol(app: INestApplication): Promise<UserSession> {
  return login(app, 'carol@taskflow.com', 'Password123!');
}
