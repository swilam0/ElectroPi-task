import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, seedDatabase, loginAsAdmin, loginAsBob, loginAsCarol } from './helpers';

let app: INestApplication;
let prisma: PrismaService;
let websiteId: string;
let mobileAppId: string;
let homepageTaskId: string;
let cicdTaskId: string;
let unassignedTaskId: string;

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
  await seedDatabase(prisma);
  const website = await prisma.project.findFirst({ where: { title: 'Website Redesign' } });
  websiteId = website!.id;
  const mobileApp = await prisma.project.findFirst({ where: { title: 'Mobile App MVP' } });
  mobileAppId = mobileApp!.id;
  const homepage = await prisma.task.findFirst({ where: { title: 'Design homepage mockup' } });
  homepageTaskId = homepage!.id;
  const cicd = await prisma.task.findFirst({ where: { title: 'Set up CI/CD pipeline' } });
  cicdTaskId = cicd!.id;
  const unassigned = await prisma.task.findFirst({ where: { title: 'API endpoint for user profiles' } });
  unassignedTaskId = unassigned!.id;
});

afterAll(async () => {
  await app.close();
});

describe('Tasks (e2e)', () => {
  describe('Task CRUD', () => {
    it('POST /api/projects/:pid/tasks — creates task with auto-set creator', async () => {
      const carolSession = await loginAsCarol(app);

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${websiteId}/tasks`)
        .set('Authorization', `Bearer ${carolSession.accessToken}`)
        .send({
          title: 'New Task',
          description: 'Test task',
          priority: 'HIGH',
          dueDate: '2026-10-01',
        })
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.title).toBe('New Task');
      expect(res.body.data.creator.id).toBe(carolSession.id);
      expect(res.body.data.status).toBe('TODO');
      expect(res.body.data.priority).toBe('HIGH');
    });

    it('POST /api/projects/:pid/tasks — assigning non-member returns 400 T-001', async () => {
      const bobSession = await loginAsBob(app);
      const carol = await prisma.user.findUnique({ where: { email: 'carol@taskflow.com' } });

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${mobileAppId}/tasks`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .send({
          title: 'Task for non-member',
          priority: 'MEDIUM',
          assigneeId: carol!.id,
        })
        .expect(400);

      expect(res.body.code).toBe('T-001');
    });

    it('GET /api/projects/:pid/tasks — lists tasks with pagination', async () => {
      const carolSession = await loginAsCarol(app);

      const res = await request(app.getHttpServer())
        .get(`/api/projects/${websiteId}/tasks`)
        .set('Authorization', `Bearer ${carolSession.accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.meta).toBeDefined();
    });

    it('GET /api/projects/:pid/tasks — filters by status', async () => {
      const carolSession = await loginAsCarol(app);

      const res = await request(app.getHttpServer())
        .get(`/api/projects/${websiteId}/tasks?status=TODO`)
        .set('Authorization', `Bearer ${carolSession.accessToken}`)
        .expect(200);

      expect(res.body.data.every((t: any) => t.status === 'TODO')).toBe(true);
    });

    it('GET /api/projects/:pid/tasks — non-member gets 403 P-001', async () => {
      const carolSession = await loginAsCarol(app);

      return request(app.getHttpServer())
        .get(`/api/projects/${mobileAppId}/tasks`)
        .set('Authorization', `Bearer ${carolSession.accessToken}`)
        .expect(403);
    });

    it('GET /api/tasks/:id — member can view task', async () => {
      const carolSession = await loginAsCarol(app);

      const res = await request(app.getHttpServer())
        .get(`/api/tasks/${homepageTaskId}`)
        .set('Authorization', `Bearer ${carolSession.accessToken}`)
        .expect(200);

      expect(res.body.data.title).toBe('Design homepage mockup');
      expect(res.body.data.projectId).toBeDefined();
    });

    it('GET /api/tasks/:id — non-member gets 404 T-002', async () => {
      const carolSession = await loginAsCarol(app);
      const mobileAppTask = await prisma.task.findFirst({ where: { title: 'Push notification integration' } });

      const res = await request(app.getHttpServer())
        .get(`/api/tasks/${mobileAppTask!.id}`)
        .set('Authorization', `Bearer ${carolSession.accessToken}`)
        .expect(404);

      expect(res.body.code).toBe('T-002');
    });

    it('PATCH /api/tasks/:id — member can update task fields', async () => {
      const carolSession = await loginAsCarol(app);

      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${homepageTaskId}`)
        .set('Authorization', `Bearer ${carolSession.accessToken}`)
        .send({ title: 'Updated Title', description: 'Updated description', priority: 'LOW' })
        .expect(200);

      expect(res.body.data.title).toBe('Updated Title');
      expect(res.body.data.priority).toBe('LOW');
    });

    it('DELETE /api/tasks/:id — admin can delete any task', async () => {
      const adminSession = await loginAsAdmin(app);
      const task = await prisma.task.create({
        data: { title: 'Temp Delete Task', description: '', status: 'TODO', priority: 'MEDIUM', projectId: websiteId, createdById: adminSession.id },
      });

      await request(app.getHttpServer())
        .delete(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(200);

      const deleted = await prisma.task.findUnique({ where: { id: task.id } });
      expect(deleted).toBeNull();
    });

    it('DELETE /api/tasks/:id — non-creator MEMBER gets 403 Z-002', async () => {
      const bobSession = await loginAsBob(app);
      const admin = await prisma.user.findUnique({ where: { email: 'admin@taskflow.com' } });
      const adminTask = await prisma.task.create({
        data: { title: 'Admin Task', description: '', status: 'TODO', priority: 'MEDIUM', projectId: websiteId, createdById: admin!.id, assigneeId: null },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/tasks/${adminTask.id}`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .expect(403);

      expect(res.body.code).toBe('Z-002');
    });
  });

  describe('TC-08: Valid task status transitions', () => {
    let carolSession: any;

    beforeAll(async () => {
      carolSession = await loginAsCarol(app);
    });

    it('Step 1: TODO → IN_PROGRESS succeeds for assignee', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${homepageTaskId}`)
        .set('Authorization', `Bearer ${carolSession.accessToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(res.body.data.status).toBe('IN_PROGRESS');
    });

    it('Step 2: IN_PROGRESS → DONE succeeds for assignee', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${homepageTaskId}`)
        .set('Authorization', `Bearer ${carolSession.accessToken}`)
        .send({ status: 'DONE' })
        .expect(200);

      expect(res.body.data.status).toBe('DONE');
    });
  });

  describe('TC-09: Invalid status transition', () => {
    it('TODO → DONE directly returns 400 T-003', async () => {
      const carolSession = await loginAsCarol(app);
      const freshTask = await prisma.task.create({
        data: { title: 'Fresh TODO', description: '', status: 'TODO', priority: 'LOW', projectId: websiteId, createdById: carolSession.id, assigneeId: carolSession.id },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${freshTask.id}`)
        .set('Authorization', `Bearer ${carolSession.accessToken}`)
        .send({ status: 'DONE' })
        .expect(400);

      expect(res.body.code).toBe('T-003');
    });
  });

  describe('TC-10: MEMBER cannot reopen a DONE task', () => {
    it('MEMBER doing DONE → TODO returns 403 T-004', async () => {
      const bobSession = await loginAsBob(app);

      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${cicdTaskId}`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .send({ status: 'TODO' })
        .expect(403);

      expect(res.body.code).toBe('T-004');
    });
  });

  describe('State machine edge cases', () => {
    it('IN_PROGRESS → TODO (rollback) succeeds for assignee', async () => {
      const carolSession = await loginAsCarol(app);
      const inProgressTask = await prisma.task.create({
        data: { title: 'Rollback Task', description: '', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: websiteId, createdById: carolSession.id, assigneeId: carolSession.id },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${inProgressTask.id}`)
        .set('Authorization', `Bearer ${carolSession.accessToken}`)
        .send({ status: 'TODO' })
        .expect(200);

      expect(res.body.data.status).toBe('TODO');
    });

    it('ADMIN can reopen DONE task (DONE → TODO)', async () => {
      const adminSession = await loginAsAdmin(app);
      const doneTask = await prisma.task.create({
        data: { title: 'Done for Reopen 1', description: '', status: 'DONE', priority: 'MEDIUM', projectId: websiteId, createdById: adminSession.id, assigneeId: null },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${doneTask.id}`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({ status: 'TODO' })
        .expect(200);

      expect(res.body.data.status).toBe('TODO');
    });

    it('ADMIN can reopen DONE task (DONE → IN_PROGRESS)', async () => {
      const adminSession = await loginAsAdmin(app);
      const doneTask = await prisma.task.create({
        data: { title: 'Done for Reopen 2', description: '', status: 'DONE', priority: 'MEDIUM', projectId: websiteId, createdById: adminSession.id, assigneeId: null },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${doneTask.id}`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(res.body.data.status).toBe('IN_PROGRESS');
    });

    it('Unassigned task moving to IN_PROGRESS returns 400 T-005', async () => {
      const bobSession = await loginAsBob(app);

      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${unassignedTaskId}`)
        .set('Authorization', `Bearer ${bobSession.accessToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(400);

      expect(res.body.code).toBe('T-005');
    });

    it('ADMIN can unassign a DONE task', async () => {
      const adminSession = await loginAsAdmin(app);
      const doneTask = await prisma.task.create({
        data: { title: 'Unassign Test', description: '', status: 'DONE', priority: 'MEDIUM', projectId: websiteId, createdById: adminSession.id, assigneeId: adminSession.id },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${doneTask.id}`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({ assigneeId: null })
        .expect(200);

      expect(res.body.data.assignee).toBeNull();
    });
  });
});
