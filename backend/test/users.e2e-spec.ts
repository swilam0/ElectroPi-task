import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, seedDatabase, loginAsAdmin, loginAsBob, loginAsCarol } from './helpers';

describe('Users (e2e)', () => {
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

  describe('List users', () => {
    it('GET /api/users — ADMIN sees paginated list', async () => {
      const adminSession = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
    });

    it('GET /api/users — MEMBER gets 403 Z-001', async () => {
      const bobSession = await loginAsBob(app);

      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .expect(403);

      expect(res.body.code).toBe('Z-001');
    });

    it('GET /api/users — search and role filter work', async () => {
      const adminSession = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .get('/api/users?search=alice&role=ADMIN')
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].email).toBe('admin@taskflow.com');
    });
  });

  describe('Find user by ID', () => {
    it('GET /api/users/:id — ADMIN can view any user', async () => {
      const adminSession = await loginAsAdmin(app);
      const bob = await prisma.user.findUnique({ where: { email: 'bob@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .get(`/api/users/${bob!.id}`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(200);

      expect(res.body.data.email).toBe('bob@taskflow.com');
    });

    it('GET /api/users/:id — MEMBER gets 403 Z-001', async () => {
      const bobSession = await loginAsBob(app);
      const carol = await prisma.user.findUnique({ where: { email: 'carol@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .get(`/api/users/${carol!.id}`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .expect(403);

      expect(res.body.code).toBe('Z-001');
    });
  });

  describe('Update profile', () => {
    it('PATCH /api/users/:id — user can update own profile', async () => {
      const bobSession = await loginAsBob(app);
      const bob = await prisma.user.findUnique({ where: { email: 'bob@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${bob!.id}`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .send({ name: 'Bob Updated', email: 'bob.new@taskflow.com' })
        .expect(200);

      expect(res.body.data.name).toBe('Bob Updated');
      expect(res.body.data.email).toBe('bob.new@taskflow.com');
    });

    it('PATCH /api/users/:id — ADMIN can update any user', async () => {
      const adminSession = await loginAsAdmin(app);
      const carol = await prisma.user.findUnique({ where: { email: 'carol@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${carol!.id}`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({ name: 'Carol Updated' })
        .expect(200);

      expect(res.body.data.name).toBe('Carol Updated');
    });

    it('PATCH /api/users/:id — MEMBER updating another user gets 403 Z-002', async () => {
      const bobSession = await loginAsBob(app);
      const carol = await prisma.user.findUnique({ where: { email: 'carol@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${carol!.id}`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .send({ name: 'Hacked' })
        .expect(403);

      expect(res.body.code).toBe('Z-002');
    });

    it('PATCH /api/users/:id — changing to existing email returns 400 A-003', async () => {
      const adminSession = await loginAsAdmin(app);
      const alice = await prisma.user.findUnique({ where: { email: 'admin@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${alice!.id}`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({ email: 'bob.new@taskflow.com' })
        .expect(400);

      expect(res.body.code).toBe('A-003');
    });
  });

  describe('Change role', () => {
    it('PATCH /api/users/:id/role — ADMIN can change role', async () => {
      const adminSession = await loginAsAdmin(app);
      const carol = await prisma.user.findUnique({ where: { email: 'carol@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${carol!.id}/role`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({ role: 'ADMIN' })
        .expect(200);

      expect(res.body.data.role).toBe('ADMIN');
    });

    it('PATCH /api/users/:id/role — ADMIN cannot change own role (Z-003)', async () => {
      const adminSession = await loginAsAdmin(app);
      const alice = await prisma.user.findUnique({ where: { email: 'admin@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${alice!.id}/role`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({ role: 'MEMBER' })
        .expect(403);

      expect(res.body.code).toBe('Z-003');
    });

    it('PATCH /api/users/:id/role — MEMBER gets 403 Z-001', async () => {
      const bobSession = await loginAsBob(app);
      const carol = await prisma.user.findUnique({ where: { email: 'carol@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${carol!.id}/role`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .send({ role: 'ADMIN' })
        .expect(403);

      expect(res.body.code).toBe('Z-001');
    });
  });

  describe('Change password', () => {
    it('PATCH /api/users/:id/password — self-service with correct currentPassword succeeds', async () => {
      const bobSession = await loginAsBob(app);
      const bob = await prisma.user.findUnique({ where: { email: 'bob@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${bob!.id}/password`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .send({ currentPassword: 'Password123!', newPassword: 'NewPass1234' })
        .expect(200);

      expect(res.body.status).toBe('success');

      // Verify can login with new password
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'bob@taskflow.com', password: 'NewPass1234' })
        .expect(200);

      expect(loginRes.body.data.accessToken).toBeDefined();
    });

    it('PATCH /api/users/:id/password — wrong currentPassword returns 400 A-003', async () => {
      const bobSession = await loginAsBob(app);
      const bob = await prisma.user.findUnique({ where: { email: 'bob@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${bob!.id}/password`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .send({ currentPassword: 'WrongPass1', newPassword: 'NewPass1234' })
        .expect(400);

      expect(res.body.code).toBe('A-003');
    });

    it('PATCH /api/users/:id/password — ADMIN can reset password without currentPassword', async () => {
      const adminSession = await loginAsAdmin(app);
      const carol = await prisma.user.findUnique({ where: { email: 'carol@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${carol!.id}/password`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({ newPassword: 'AdminReset1' })
        .expect(200);

      expect(res.body.status).toBe('success');

      // Verify Carol can login with new password
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'carol@taskflow.com', password: 'AdminReset1' })
        .expect(200);

      expect(loginRes.body.data.accessToken).toBeDefined();
    });
  });

  describe('Delete user', () => {
    it('DELETE /api/users/:id — ADMIN can delete a user', async () => {
      const adminSession = await loginAsAdmin(app);

      // Create a temp user to delete
      const tempUser = await prisma.user.create({
        data: { email: 'deleteme@test.com', password: 'hash', name: 'Delete Me', role: 'MEMBER' },
      });

      await request(app.getHttpServer())
        .delete(`/api/users/${tempUser.id}`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(200);

      const deleted = await prisma.user.findUnique({ where: { id: tempUser.id } });
      expect(deleted).toBeNull();
    });

    it('DELETE /api/users/:id — ADMIN cannot delete self (Z-003)', async () => {
      const adminSession = await loginAsAdmin(app);
      const alice = await prisma.user.findUnique({ where: { email: 'admin@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .delete(`/api/users/${alice!.id}`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(403);

      expect(res.body.code).toBe('Z-003');
    });

    it('DELETE /api/users/:id — MEMBER gets 403 Z-001', async () => {
      const bobSession = await loginAsBob(app);
      const carol = await prisma.user.findUnique({ where: { email: 'carol@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .delete(`/api/users/${carol!.id}`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .expect(403);

      expect(res.body.code).toBe('Z-001');
    });

    it('DELETE /api/users/:id — user with owned projects returns 409 U-002', async () => {
      const adminSession = await loginAsAdmin(app);
      // Bob owns "Mobile App MVP" — should get 409
      const bob = await prisma.user.findUnique({ where: { email: 'bob@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .delete(`/api/users/${bob!.id}`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(409);

      expect(res.body.code).toBe('U-002');
    });
  });
});
