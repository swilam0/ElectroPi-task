import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, seedDatabase, login, loginAsAdmin, loginAsBob, loginAsCarol } from './helpers';

describe('Projects (e2e)', () => {
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

  describe('TC-04: Create project without authentication returns 401', () => {
    it('should return 401 A-001 when no token provided', () => {
      return request(app.getHttpServer())
        .post('/api/projects')
        .send({ title: 'My Project', description: '' })
        .expect(401)
        .expect((res) => {
          expect(res.body.code).toBe('A-001');
        });
    });

    it('should return 401 on all protected project endpoints', async () => {
      await request(app.getHttpServer()).get('/api/projects').expect(401);
      await request(app.getHttpServer()).get('/api/projects/some-id').expect(401);
      await request(app.getHttpServer()).patch('/api/projects/some-id').send({ title: 'x' }).expect(401);
      await request(app.getHttpServer()).delete('/api/projects/some-id').expect(401);
      await request(app.getHttpServer()).post('/api/projects/some-id/members').send({ userId: 'x' }).expect(401);
    });
  });

  describe('Project CRUD', () => {
    it('POST /api/projects creates project and auto-adds creator as member', async () => {
      const session = await loginAsBob(app);

      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ title: 'New Test Project', description: 'Testing creation' })
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.title).toBe('New Test Project');
      expect(res.body.data.createdBy.id).toBe(session.id);

      // Verify creator was auto-added as member
      const membership = await prisma.projectMember.findFirst({
        where: { userId: session.id, projectId: res.body.data.id },
      });
      expect(membership).not.toBeNull();
    });

    it('GET /api/projects — ADMIN sees all projects', async () => {
      const session = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta).toBeDefined();
    });

    it('GET /api/projects — MEMBER sees only their projects', async () => {
      const session = await loginAsCarol(app);

      const res = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      // Carol is member of only Website Redesign
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Website Redesign');
    });

    it('GET /api/projects/:id — member can view project with members list', async () => {
      const session = await loginAsBob(app);
      const website = await prisma.project.findFirst({ where: { title: 'Website Redesign' } });

      const res = await request(app.getHttpServer())
        .get(`/api/projects/${website!.id}`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.title).toBe('Website Redesign');
      expect(res.body.data.creator).toBeDefined();
      expect(res.body.data.memberCount).toBeGreaterThanOrEqual(3);
    });

    it('GET /api/projects/:id — non-member gets 403 P-001', async () => {
      // Carol is NOT a member of Mobile App MVP
      const session = await loginAsCarol(app);
      const mobileApp = await prisma.project.findFirst({ where: { title: 'Mobile App MVP' } });

      const res = await request(app.getHttpServer())
        .get(`/api/projects/${mobileApp!.id}`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(403);

      expect(res.body.code).toBe('P-001');
    });

    it('PATCH /api/projects/:id — member can update title/description', async () => {
      const session = await loginAsBob(app);
      const website = await prisma.project.findFirst({ where: { title: 'Website Redesign' } });

      const res = await request(app.getHttpServer())
        .patch(`/api/projects/${website!.id}`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ title: 'Updated Title', description: 'Updated desc' })
        .expect(200);

      expect(res.body.data.title).toBe('Updated Title');
    });

    it('PATCH /api/projects/:id — non-member gets 403', async () => {
      const session = await loginAsCarol(app);
      const mobileApp = await prisma.project.findFirst({ where: { title: 'Mobile App MVP' } });

      return request(app.getHttpServer())
        .patch(`/api/projects/${mobileApp!.id}`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ title: 'Hacked' })
        .expect(403);
    });
  });

  describe('TC-05: Non-member cannot view project tasks', () => {
    it('should return 403 P-001 for non-member viewing project tasks', async () => {
      // Carol is NOT a member of Mobile App MVP
      const session = await loginAsCarol(app);
      const mobileApp = await prisma.project.findFirst({ where: { title: 'Mobile App MVP' } });

      const res = await request(app.getHttpServer())
        .get(`/api/projects/${mobileApp!.id}/tasks`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(403);

      expect(res.body.code).toBe('P-001');
    });
  });

  describe('TC-06: MEMBER cannot add members', () => {
    it('should return 403 Z-001 when MEMBER tries to add a member', async () => {
      const bobSession = await loginAsBob(app);
      const website = await prisma.project.findFirst({ where: { title: 'Website Redesign' } });
      const carol = await prisma.user.findUnique({ where: { email: 'carol@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${website!.id}/members`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .send({ userId: carol!.id })
        .expect(403);

      expect(res.body.code).toBe('Z-001');
    });
  });

  describe('TC-07: ADMIN adds a member', () => {
    it('should return 201 when ADMIN adds Carol to Mobile App MVP', async () => {
      const adminSession = await loginAsAdmin(app);
      const mobileApp = await prisma.project.findFirst({ where: { title: 'Mobile App MVP' } });
      const carol = await prisma.user.findUnique({ where: { email: 'carol@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${mobileApp!.id}/members`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({ userId: carol!.id })
        .expect(201);

      expect(res.body.status).toBe('success');

      // Verify Carol is now a member
      const membership = await prisma.projectMember.findFirst({
        where: { userId: carol!.id, projectId: mobileApp!.id },
      });
      expect(membership).not.toBeNull();
    });
  });

  describe('Member management edge cases', () => {
    it('should return 409 P-003 when adding an already-existing member', async () => {
      const adminSession = await loginAsAdmin(app);
      const website = await prisma.project.findFirst({ where: { title: 'Website Redesign' } });
      const bob = await prisma.user.findUnique({ where: { email: 'bob@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${website!.id}/members`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({ userId: bob!.id })
        .expect(409);

      expect(res.body.code).toBe('P-003');
    });

    it('should return 403 Z-001 when MEMBER tries to remove member', async () => {
      const bobSession = await loginAsBob(app);
      const website = await prisma.project.findFirst({ where: { title: 'Website Redesign' } });
      const carol = await prisma.user.findUnique({ where: { email: 'carol@taskflow.com' } });

      return request(app.getHttpServer())
        .delete(`/api/projects/${website!.id}/members/${carol!.id}`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .expect(403);
    });

    it('should return 403 P-004 when ADMIN tries to remove project creator', async () => {
      const adminSession = await loginAsAdmin(app);
      const mobileApp = await prisma.project.findFirst({ where: { title: 'Mobile App MVP' } });
      const bob = await prisma.user.findUnique({ where: { email: 'bob@taskflow.com' } });
      // Bob is the creator of Mobile App MVP

      const res = await request(app.getHttpServer())
        .delete(`/api/projects/${mobileApp!.id}/members/${bob!.id}`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(403);

      expect(res.body.code).toBe('P-004');
    });

    it('DELETE /api/projects/:id — creator can delete own project', async () => {
      const bobSession = await loginAsBob(app);
      const newProject = await prisma.project.create({
        data: { title: 'Temp Project', createdById: bobSession.id },
      });

      await request(app.getHttpServer())
        .delete(`/api/projects/${newProject.id}`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .expect(200);

      const deleted = await prisma.project.findUnique({ where: { id: newProject.id } });
      expect(deleted).toBeNull();
    });

    it('DELETE /api/projects/:id — non-creator member gets 403 Z-002', async () => {
      const carolSession = await loginAsCarol(app);
      const mobileApp = await prisma.project.findFirst({ where: { title: 'Mobile App MVP' } });

      const res = await request(app.getHttpServer())
        .delete(`/api/projects/${mobileApp!.id}`)
        .set('Authorization', `Bearer ${carolSession.accessToken}`)
        .expect(403);

      expect(res.body.code).toBe('Z-002');
    });
  });
});
