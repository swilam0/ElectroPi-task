import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, seedDatabase, login, loginAsAdmin, loginAsBob, loginAsCarol } from './helpers';

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
      const adminSession = await loginAsAdmin(app);
      const alice = await prisma.user.findUnique({ where: { email: 'admin@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${alice!.id}`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({ name: 'Alice Updated' })
        .expect(200);

      expect(res.body.data.name).toBe('Alice Updated');
      expect(res.body.data.email).toBe('admin@taskflow.com');
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
      // Use the fresh email for Carol
      const freshCarol = await prisma.user.findUnique({ where: { id: carol!.id } });

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${freshCarol!.id}`)
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
        .send({ email: 'bob@taskflow.com' })
        .expect(400);

      expect(res.body.code).toBe('A-003');
    });
  });

  describe('Change role', () => {
    let tempUserEmail: string;
    let tempUserId: string;

    beforeEach(async () => {
      const tempUser = await prisma.user.create({
        data: { email: `role-temp-${Date.now()}@test.com`, password: 'hash', name: 'Role Temp', role: 'MEMBER' },
      });
      tempUserId = tempUser.id;
      tempUserEmail = tempUser.email;
    });

    it('PATCH /api/users/:id/role — ADMIN can change role', async () => {
      const adminSession = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${tempUserId}/role`)
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

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${tempUserId}/role`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .send({ role: 'ADMIN' })
        .expect(403);

      expect(res.body.code).toBe('Z-001');
    });
  });

  describe('Change password', () => {
    let tempUserEmail: string;
    let tempUserPassword: string;
    let tempUserId: string;

    beforeEach(async () => {
      tempUserPassword = 'Password123!';
      const hashed = await bcrypt.hash(tempUserPassword, 12);
      const tempUser = await prisma.user.create({
        data: { email: `pass-temp-${Date.now()}@test.com`, password: hashed, name: 'Pass Temp', role: 'MEMBER' },
      });
      tempUserId = tempUser.id;
      tempUserEmail = tempUser.email;
    });

    it('PATCH /api/users/:id/password — self-service with correct currentPassword succeeds', async () => {
      const session = await login(app, tempUserEmail, tempUserPassword);

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${tempUserId}/password`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ currentPassword: tempUserPassword, newPassword: 'NewPass1234' })
        .expect(200);

      expect(res.body.status).toBe('success');

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: tempUserEmail, password: 'NewPass1234' })
        .expect(200);

      expect(loginRes.body.data.accessToken).toBeDefined();
    });

    it('PATCH /api/users/:id/password — wrong currentPassword returns 400 A-003', async () => {
      const session = await login(app, tempUserEmail, tempUserPassword);

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${tempUserId}/password`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ currentPassword: 'WrongPass1', newPassword: 'NewPass1234' })
        .expect(400);

      expect(res.body.code).toBe('A-003');
    });

    it('PATCH /api/users/:id/password — ADMIN can reset password without currentPassword', async () => {
      const adminSession = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${tempUserId}/password`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({ newPassword: 'AdminReset1' })
        .expect(200);

      expect(res.body.status).toBe('success');

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: tempUserEmail, password: 'AdminReset1' })
        .expect(200);

      expect(loginRes.body.data.accessToken).toBeDefined();
    });
  });

  describe('Delete user', () => {
    it('DELETE /api/users/:id — ADMIN can delete a user', async () => {
      const adminSession = await loginAsAdmin(app);
      const tempUser = await prisma.user.create({
        data: { email: `delete-temp-${Date.now()}@test.com`, password: 'hash', name: 'Delete Me', role: 'MEMBER' },
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
      const adminSession = await loginAsAdmin(app);
      const tempUser = await prisma.user.create({
        data: { email: `delete-temp2-${Date.now()}@test.com`, password: 'hash', name: 'Delete Me', role: 'MEMBER' },
      });
      const bobSession = await loginAsBob(app);

      const res = await request(app.getHttpServer())
        .delete(`/api/users/${tempUser.id}`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .expect(403);

      expect(res.body.code).toBe('Z-001');
    });

    it('DELETE /api/users/:id — user with owned projects returns 409 U-002', async () => {
      const adminSession = await loginAsAdmin(app);
      const tempUser = await prisma.user.create({
        data: { email: `delete-temp3-${Date.now()}@test.com`, password: 'hash', name: 'Temp Owner', role: 'MEMBER' },
      });
      await prisma.project.create({
        data: { title: 'Owned Project', createdById: tempUser.id },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/users/${tempUser.id}`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(409);

      expect(res.body.code).toBe('U-002');
    });
  });
});
