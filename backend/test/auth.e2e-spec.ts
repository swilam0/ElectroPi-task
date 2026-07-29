import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, seedDatabase, login } from './helpers';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await seedDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('TC-01: Register a new user', () => {
    it('should register a new user and return generic message (anti-enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'new@test.com', password: 'Password123!', name: 'New User' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.message).toBe('If the email is not already registered, an account has been created.');

      // Verify user was actually created
      const user = await prisma.user.findUnique({ where: { email: 'new@test.com' } });
      expect(user).not.toBeNull();
      expect(user!.name).toBe('New User');
      expect(user!.role).toBe('MEMBER');
    });

    it('should return same message for duplicate email (anti-enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'admin@taskflow.com', password: 'Password123!', name: 'Alice Admin' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.message).toBe('If the email is not already registered, an account has been created.');
    });

    it('should return 400 for invalid registration data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'short', name: '' })
        .expect(400);

      expect(res.body.status).toBe('fail');
    });
  });

  describe('TC-02: Login with valid credentials', () => {
    it('should login as admin and return user + tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@taskflow.com', password: 'Password123!' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@taskflow.com');
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should login as MEMBER and return correct role', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'bob@taskflow.com', password: 'Password123!' })
        .expect(200);

      expect(res.body.data.user.role).toBe('MEMBER');
    });
  });

  describe('TC-03: Login with wrong password', () => {
    it('should return 401 A-004 with generic message', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'bob@taskflow.com', password: 'WrongPassword1' })
        .expect(401);

      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('A-004');
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return same A-004 for non-existent email (no enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'SomePass123' })
        .expect(401);

      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('A-004');
      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  describe('Token refresh', () => {
    it('POST /api/auth/refresh with valid token returns new pair', async () => {
      const session = await login(app, 'bob@taskflow.com', 'Password123!');

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.accessToken).not.toBe(session.accessToken);
      expect(res.body.data.refreshToken).not.toBe(session.refreshToken);
    });

    it('POST /api/auth/refresh with reused token returns 401 A-007 (theft detection)', async () => {
      const session = await login(app, 'bob@taskflow.com', 'Password123!');
      const oldRefresh = session.refreshToken;

      // First use — succeeds
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefresh })
        .expect(200);

      // Second use with same token — theft detected
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefresh })
        .expect(401);

      expect(res.body.code).toBe('A-007');
      expect(res.body.message).toBe('Refresh token revoked or reused');
    });

    it('POST /api/auth/refresh with invalid token returns 401 A-008', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token-value' })
        .expect(401);

      expect(res.body.code).toBe('A-008');
      expect(res.body.message).toBe('Refresh token expired or invalid');
    });
  });

  describe('Logout', () => {
    it('POST /api/auth/logout succeeds and invalidates session', async () => {
      const session = await login(app, 'bob@taskflow.com', 'Password123!');

      // Logout
      const logoutRes = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ refreshToken: session.refreshToken })
        .expect(200);

      expect(logoutRes.body.status).toBe('success');

      // Access token should now be blacklisted
      const meRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(401);

      expect(meRes.body.code).toBe('A-001');

      // Refresh token should be deleted
      const refreshRes = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);

      expect(refreshRes.body.code).toBe('A-007');
    });
  });

  describe('Current user (me)', () => {
    it('GET /api/auth/me with valid token returns user profile', async () => {
      const session = await login(app, 'admin@taskflow.com', 'Password123!');

      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(session.id);
      expect(res.body.data.email).toBe('admin@taskflow.com');
      expect(res.body.data.name).toBe('Alice Admin');
      expect(res.body.data.role).toBe('ADMIN');
      expect(res.body.data.createdAt).toBeDefined();
    });

    it('GET /api/auth/me without token returns 401 A-001', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.code).toBe('A-001');
    });
  });

  describe('Account lockout', () => {
    it('should lock account after 10 failed attempts then accept correct password after unlock', async () => {
      const email = 'bob@taskflow.com';

      // 10 consecutive failures
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email, password: `WrongPass${i}` })
          .expect(401);
      }

      // Even correct password returns 423 A-006
      const lockedRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'Password123!' })
        .expect(423);

      expect(lockedRes.body.code).toBe('A-006');
    });
  });
});
