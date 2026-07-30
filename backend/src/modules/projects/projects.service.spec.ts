import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockProject, createMockProjectMember, createMockUser } from '../../common/test/factories';
import { UsersRepository } from '../users/users.repository';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: jest.Mocked<ProjectsRepository>;
  let usersRepository: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    projectsRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      isMember: jest.fn(),
      findMember: jest.fn(),
      findProjectCreator: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
    } as any;

    usersRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: ProjectsRepository, useValue: projectsRepository },
        { provide: UsersRepository, useValue: usersRepository },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  describe('create', () => {
    it('should create a project and return it with creator', async () => {
      const project = createMockProject({ title: 'New Project' });
      projectsRepository.create.mockResolvedValue(project);

      const dto: CreateProjectDto = { title: 'New Project', description: 'Desc' };
      const result = await service.create('user-id', dto);

      expect(result.title).toBe('New Project');
      expect(result.creator).toBeDefined();
      expect(projectsRepository.create).toHaveBeenCalledWith({
        title: 'New Project', description: 'Desc', createdById: 'user-id',
      });
    });
  });

  describe('list', () => {
    it('should return paginated projects with counts', async () => {
      const projects = [createMockProject(), createMockProject()];
      projectsRepository.findAll.mockResolvedValue({ projects, total: 2 });

      const result = await service.list('user-id', 'MEMBER', { page: 1, limit: 20 });

      expect(result.projects).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.projects[0].memberCount).toBe(3);
      expect(result.projects[0].taskCount).toBe(5);
    });

    it('should pass isAdmin=true for ADMIN', async () => {
      projectsRepository.findAll.mockResolvedValue({ projects: [], total: 0 });

      await service.list('admin-id', 'ADMIN', { page: 1, limit: 20 });

      expect(projectsRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ isAdmin: true, userId: 'admin-id' }),
      );
    });
  });

  describe('findById', () => {
    it('should return project for ADMIN without membership check', async () => {
      const project = createMockProject({ members: [{ user: createMockUser() } as any] });
      projectsRepository.findById.mockResolvedValue(project);

      const result = await service.findById('admin-id', 'ADMIN', project.id);

      expect(result.id).toBe(project.id);
      expect(projectsRepository.isMember).not.toHaveBeenCalled();
    });

    it('should return project for MEMBER who is a member', async () => {
      const project = createMockProject({ members: [] });
      projectsRepository.findById.mockResolvedValue(project);
      projectsRepository.isMember.mockResolvedValue(true);

      const result = await service.findById('member-id', 'MEMBER', project.id);

      expect(result.id).toBe(project.id);
    });

    it('should throw P-001 when MEMBER is not a member', async () => {
      const project = createMockProject();
      projectsRepository.findById.mockResolvedValue(project);
      projectsRepository.isMember.mockResolvedValue(false);

      await expect(
        service.findById('member-id', 'MEMBER', project.id),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'You are not a member of this project', code: 'P-001' }),
      );
    });

    it('should throw P-002 when project not found', async () => {
      projectsRepository.findById.mockResolvedValue(null);

      await expect(
        service.findById('user-id', 'MEMBER', 'unknown'),
      ).rejects.toThrow(
        new NotFoundException({ status: 'error', message: 'Project not found', code: 'P-002' }),
      );
    });
  });

  describe('update', () => {
    const project = createMockProject();

    it('should allow ADMIN to update any project', async () => {
      projectsRepository.findById.mockResolvedValue(project);
      projectsRepository.update.mockResolvedValue({ ...project, title: 'Updated' });

      const dto: UpdateProjectDto = { title: 'Updated' };
      const result = await service.update('admin-id', 'ADMIN', project.id, dto);

      expect(result.title).toBe('Updated');
    });

    it('should allow member to update project', async () => {
      projectsRepository.findById.mockResolvedValue(project);
      projectsRepository.isMember.mockResolvedValue(true);
      projectsRepository.update.mockResolvedValue({ ...project, title: 'Updated' });

      const dto: UpdateProjectDto = { title: 'Updated' };
      const result = await service.update('member-id', 'MEMBER', project.id, dto);

      expect(result.title).toBe('Updated');
    });

    it('should throw P-001 when non-member tries to update', async () => {
      projectsRepository.findById.mockResolvedValue(project);
      projectsRepository.isMember.mockResolvedValue(false);

      const dto: UpdateProjectDto = { title: 'Hacked' };
      await expect(
        service.update('other-id', 'MEMBER', project.id, dto),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'You are not a member of this project', code: 'P-001' }),
      );
    });
  });

  describe('delete', () => {
    const project = createMockProject();

    it('should allow ADMIN to delete any project', async () => {
      projectsRepository.findById.mockResolvedValue(project);
      projectsRepository.delete.mockResolvedValue(project as any);

      await service.delete('admin-id', 'ADMIN', project.id);

      expect(projectsRepository.delete).toHaveBeenCalledWith(project.id);
    });

    it('should allow creator MEMBER to delete own project', async () => {
      projectsRepository.findById.mockResolvedValue(project);
      projectsRepository.isMember.mockResolvedValue(true);
      projectsRepository.findProjectCreator.mockResolvedValue(project.createdById);

      await service.delete(project.createdById, 'MEMBER', project.id);

      expect(projectsRepository.delete).toHaveBeenCalled();
    });

    it('should throw Z-002 when non-creator MEMBER tries to delete', async () => {
      projectsRepository.findById.mockResolvedValue(project);
      projectsRepository.isMember.mockResolvedValue(true);
      projectsRepository.findProjectCreator.mockResolvedValue(project.createdById);

      await expect(
        service.delete('other-member', 'MEMBER', project.id),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'Cannot modify this resource', code: 'Z-002' }),
      );
    });
  });

  describe('addMember', () => {
    const projectId = 'project-id';
    const dto: AddMemberDto = { email: 'user@example.com' };

    it('should allow ADMIN to add a member', async () => {
      projectsRepository.findById.mockResolvedValue(createMockProject());
      usersRepository.findByEmail.mockResolvedValue(createMockUser());
      projectsRepository.findMember.mockResolvedValue(null);
      projectsRepository.addMember.mockResolvedValue(createMockProjectMember());

      const result = await service.addMember('ADMIN', projectId, dto);

      expect(result).toBeDefined();
    });

    it('should throw Z-001 when MEMBER tries to add a member', async () => {
      await expect(
        service.addMember('MEMBER', projectId, dto),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'Insufficient permissions', code: 'Z-001' }),
      );
    });

    it('should throw P-003 when user is already a member', async () => {
      projectsRepository.findById.mockResolvedValue(createMockProject());
      usersRepository.findByEmail.mockResolvedValue(createMockUser());
      projectsRepository.findMember.mockResolvedValue(createMockProjectMember());

      await expect(
        service.addMember('ADMIN', projectId, dto),
      ).rejects.toThrow(
        new ConflictException({ status: 'error', message: 'User is already a member', code: 'P-003' }),
      );
    });
  });

  describe('removeMember', () => {
    const projectId = 'project-id';
    const targetUserId = 'target-user';

    it('should allow ADMIN to remove a member', async () => {
      const project = createMockProject({ createdById: 'creator-id' });
      projectsRepository.findById.mockResolvedValue(project);
      usersRepository.findById.mockResolvedValue(createMockUser());
      projectsRepository.findProjectCreator.mockResolvedValue('creator-id');
      projectsRepository.findMember.mockResolvedValue(createMockProjectMember());

      await service.removeMember('ADMIN', projectId, targetUserId);

      expect(projectsRepository.removeMember).toHaveBeenCalledWith(projectId, targetUserId);
    });

    it('should throw P-004 when trying to remove creator', async () => {
      const project = createMockProject({ createdById: targetUserId });
      projectsRepository.findById.mockResolvedValue(project);
      usersRepository.findById.mockResolvedValue(createMockUser());
      projectsRepository.findProjectCreator.mockResolvedValue(targetUserId);

      await expect(
        service.removeMember('ADMIN', projectId, targetUserId),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'Cannot remove the project creator', code: 'P-004' }),
      );
    });
  });
});
