import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Priority, TaskStatus } from '@prisma/client';
import { createMockProject, createMockTask } from '../../common/test/factories';
import { ProjectsRepository } from '../projects/projects.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let tasksRepository: jest.Mocked<TasksRepository>;
  let projectsRepository: jest.Mocked<ProjectsRepository>;

  beforeEach(async () => {
    tasksRepository = {
      create: jest.fn(),
      findByProject: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    projectsRepository = {
      findById: jest.fn(),
      isMember: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TasksRepository, useValue: tasksRepository },
        { provide: ProjectsRepository, useValue: projectsRepository },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('create', () => {
    const projectId = 'project-id';
    const dto: CreateTaskDto = {
      title: 'New Task',
      description: 'Task desc',
      priority: 'HIGH',
      assigneeId: 'assignee-id',
    };

    it('should create a task and auto-set creator', async () => {
      projectsRepository.findById.mockResolvedValue(createMockProject());
      projectsRepository.isMember.mockResolvedValue(true);
      tasksRepository.create.mockResolvedValue(createMockTask());

      const result = await service.create('creator-id', projectId, dto);

      expect(tasksRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdById: 'creator-id', projectId }),
      );
      expect(result.creator).toBeDefined();
    });

    it('should throw P-001 when user is not a project member', async () => {
      projectsRepository.findById.mockResolvedValue(createMockProject());
      projectsRepository.isMember.mockResolvedValue(false);

      await expect(service.create('non-member', projectId, dto)).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'You are not a member of this project', code: 'P-001' }),
      );
    });

    it('should throw T-001 when assignee is not a project member', async () => {
      projectsRepository.findById.mockResolvedValue(createMockProject());
      projectsRepository.isMember
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(service.create('creator-id', projectId, dto)).rejects.toThrow(
        new BadRequestException({ status: 'error', message: 'Assignee is not a member of this project', code: 'T-001' }),
      );
    });
  });

  describe('listByProject', () => {
    const projectId = 'project-id';

    it('should return paginated tasks for a member', async () => {
      projectsRepository.findById.mockResolvedValue(createMockProject());
      projectsRepository.isMember.mockResolvedValue(true);
      tasksRepository.findByProject.mockResolvedValue({ tasks: [createMockTask()], total: 1 });

      const result = await service.listByProject('user-id', 'MEMBER', projectId, { page: 1, limit: 20 });

      expect(result.tasks).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should return tasks for ADMIN without membership check', async () => {
      projectsRepository.findById.mockResolvedValue(createMockProject());
      tasksRepository.findByProject.mockResolvedValue({ tasks: [], total: 0 });

      await service.listByProject('admin-id', 'ADMIN', projectId, {});

      expect(projectsRepository.isMember).not.toHaveBeenCalled();
    });

    it('should throw P-001 when non-admin non-member requests', async () => {
      projectsRepository.findById.mockResolvedValue(createMockProject());
      projectsRepository.isMember.mockResolvedValue(false);

      await expect(
        service.listByProject('user-id', 'MEMBER', projectId, {}),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'You are not a member of this project', code: 'P-001' }),
      );
    });
  });

  describe('findById', () => {
    it('should return a task when user is a member', async () => {
      const task = createMockTask();
      tasksRepository.findById.mockResolvedValue(task);
      projectsRepository.isMember.mockResolvedValue(true);

      const result = await service.findById('user-id', 'MEMBER', task.id);

      expect(result.id).toBe(task.id);
    });

    it('should return task for ADMIN without membership check', async () => {
      const task = createMockTask();
      tasksRepository.findById.mockResolvedValue(task);

      const result = await service.findById('admin-id', 'ADMIN', task.id);

      expect(result.id).toBe(task.id);
      expect(projectsRepository.isMember).not.toHaveBeenCalled();
    });

    it('should throw T-002 (existence-avoidance) when non-member requests', async () => {
      const task = createMockTask();
      tasksRepository.findById.mockResolvedValue(task);
      projectsRepository.isMember.mockResolvedValue(false);

      await expect(
        service.findById('user-id', 'MEMBER', task.id),
      ).rejects.toThrow(
        new NotFoundException({ status: 'error', message: 'Task not found', code: 'T-002' }),
      );
    });

    it('should throw T-002 when task does not exist', async () => {
      tasksRepository.findById.mockResolvedValue(null);

      await expect(
        service.findById('user-id', 'MEMBER', 'unknown'),
      ).rejects.toThrow(
        new NotFoundException({ status: 'error', message: 'Task not found', code: 'T-002' }),
      );
    });
  });

  describe('update', () => {
    const task = createMockTask({ status: TaskStatus.TODO, assigneeId: 'assignee-1', createdById: 'creator-1' });

    it('should allow any member to update title/description/priority/dueDate', async () => {
      tasksRepository.findById.mockResolvedValue(task);
      projectsRepository.isMember.mockResolvedValue(true);
      tasksRepository.update.mockResolvedValue(task);

      const dto: UpdateTaskDto = { title: 'Updated Title', priority: 'LOW' };
      const result = await service.update('member-id', 'MEMBER', task.id, dto);

      expect(result.title).toBe(task.title);
    });

    it('should allow TODO→IN_PROGRESS transition (happy path forward)', async () => {
      tasksRepository.findById.mockResolvedValue(task);
      projectsRepository.isMember.mockResolvedValue(true);
      tasksRepository.update.mockResolvedValue({ ...task, status: TaskStatus.IN_PROGRESS });

      const dto: UpdateTaskDto = { status: 'IN_PROGRESS' };
      const result = await service.update('assignee-1', 'MEMBER', task.id, dto);

      expect(tasksRepository.update).toHaveBeenCalled();
    });

    it('should allow IN_PROGRESS→TODO rollback', async () => {
      const inProgressTask = { ...task, status: TaskStatus.IN_PROGRESS, assigneeId: 'assignee-1' };
      tasksRepository.findById.mockResolvedValue(inProgressTask);
      projectsRepository.isMember.mockResolvedValue(true);
      tasksRepository.update.mockResolvedValue({ ...inProgressTask, status: TaskStatus.TODO });

      const dto: UpdateTaskDto = { status: 'TODO' };
      const result = await service.update('assignee-1', 'MEMBER', task.id, dto);

      expect(tasksRepository.update).toHaveBeenCalled();
    });

    it('should allow IN_PROGRESS→DONE transition', async () => {
      const inProgressTask = { ...task, status: TaskStatus.IN_PROGRESS, assigneeId: 'assignee-1' };
      tasksRepository.findById.mockResolvedValue(inProgressTask);
      projectsRepository.isMember.mockResolvedValue(true);
      tasksRepository.update.mockResolvedValue({ ...inProgressTask, status: TaskStatus.DONE });

      const dto: UpdateTaskDto = { status: 'DONE' };
      const result = await service.update('assignee-1', 'MEMBER', task.id, dto);

      expect(tasksRepository.update).toHaveBeenCalled();
    });

    it('should block TODO→DONE directly (T-003)', async () => {
      tasksRepository.findById.mockResolvedValue(task);
      projectsRepository.isMember.mockResolvedValue(true);

      const dto: UpdateTaskDto = { status: 'DONE' };
      await expect(
        service.update('assignee-1', 'MEMBER', task.id, dto),
      ).rejects.toThrow(
        new BadRequestException({ status: 'error', message: 'Invalid status transition', code: 'T-003' }),
      );
    });

    it('should only allow ADMIN to reopen DONE tasks (T-004 for MEMBER)', async () => {
      const doneTask = { ...task, status: TaskStatus.DONE };
      tasksRepository.findById.mockResolvedValue(doneTask);
      projectsRepository.isMember.mockResolvedValue(true);

      const dto: UpdateTaskDto = { status: 'TODO' };
      await expect(
        service.update('member-id', 'MEMBER', task.id, dto),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'Not authorized to change task status', code: 'T-004' }),
      );
    });

    it('should allow ADMIN to reopen DONE tasks', async () => {
      const doneTask = { ...task, status: TaskStatus.DONE, assigneeId: 'admin-id' };
      tasksRepository.findById.mockResolvedValue(doneTask);
      tasksRepository.update.mockResolvedValue({ ...doneTask, status: TaskStatus.TODO });

      const dto: UpdateTaskDto = { status: 'TODO' };
      const result = await service.update('admin-id', 'ADMIN', task.id, dto);

      expect(tasksRepository.update).toHaveBeenCalled();
    });

    it('should block TODO→IN_PROGRESS when unassigned (T-005)', async () => {
      const unassignedTask = { ...task, assigneeId: null };
      tasksRepository.findById.mockResolvedValue(unassignedTask);
      projectsRepository.isMember.mockResolvedValue(true);

      const dto: UpdateTaskDto = { status: 'IN_PROGRESS' };
      await expect(
        service.update('creator-1', 'MEMBER', task.id, dto),
      ).rejects.toThrow(
        new BadRequestException({ status: 'error', message: 'Cannot start a task without an assignee', code: 'T-005' }),
      );
    });

    it('should require full member (T-001) for reassignment to non-member', async () => {
      tasksRepository.findById.mockResolvedValue(task);
      projectsRepository.isMember.mockResolvedValue(true);

      const dto: UpdateTaskDto = { assigneeId: 'non-member-id' };
      projectsRepository.isMember.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await expect(
        service.update('member-id', 'MEMBER', task.id, dto),
      ).rejects.toThrow(
        new BadRequestException({ status: 'error', message: 'Assignee is not a member of this project', code: 'T-001' }),
      );
    });

    it('should allow ADMIN to unassign a DONE task', async () => {
      const doneTask = { ...task, status: TaskStatus.DONE };
      tasksRepository.findById.mockResolvedValue(doneTask);
      tasksRepository.update.mockResolvedValue({ ...doneTask, assigneeId: null });

      const dto: UpdateTaskDto = { assigneeId: null };
      const result = await service.update('admin-id', 'ADMIN', task.id, dto);

      expect(tasksRepository.update).toHaveBeenCalled();
    });

    it('should block MEMBER from unassigning a DONE task', async () => {
      const doneTask = { ...task, status: TaskStatus.DONE };
      tasksRepository.findById.mockResolvedValue(doneTask);
      projectsRepository.isMember.mockResolvedValue(true);

      const dto: UpdateTaskDto = { assigneeId: null };
      await expect(
        service.update('member-id', 'MEMBER', task.id, dto),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'Cannot modify this resource', code: 'Z-002' }),
      );
    });

    it('should allow any member to unassign a non-DONE task', async () => {
      tasksRepository.findById.mockResolvedValue(task);
      projectsRepository.isMember.mockResolvedValue(true);
      tasksRepository.update.mockResolvedValue({ ...task, assigneeId: null });

      const dto: UpdateTaskDto = { assigneeId: null };
      const result = await service.update('member-id', 'MEMBER', task.id, dto);

      expect(tasksRepository.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should allow ADMIN to delete any task', async () => {
      const task = createMockTask();
      tasksRepository.findById.mockResolvedValue(task);
      tasksRepository.delete.mockResolvedValue(task as any);

      await service.delete('admin-id', 'ADMIN', task.id);

      expect(tasksRepository.delete).toHaveBeenCalledWith(task.id);
    });

    it('should allow creator MEMBER to delete own task', async () => {
      const task = createMockTask({ createdById: 'creator-id' });
      tasksRepository.findById.mockResolvedValue(task);
      projectsRepository.isMember.mockResolvedValue(true);

      await service.delete('creator-id', 'MEMBER', task.id);

      expect(tasksRepository.delete).toHaveBeenCalledWith(task.id);
    });

    it('should throw Z-002 when non-creator MEMBER tries to delete', async () => {
      const task = createMockTask({ createdById: 'creator-id' });
      tasksRepository.findById.mockResolvedValue(task);
      projectsRepository.isMember.mockResolvedValue(true);

      await expect(
        service.delete('other-member', 'MEMBER', task.id),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'Cannot modify this resource', code: 'Z-002' }),
      );
    });

    it('should throw T-002 when task not found', async () => {
      tasksRepository.findById.mockResolvedValue(null);

      await expect(
        service.delete('user-id', 'ADMIN', 'unknown'),
      ).rejects.toThrow(
        new NotFoundException({ status: 'error', message: 'Task not found', code: 'T-002' }),
      );
    });
  });
});
