import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsRepository } from './projects.repository';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(currentUserId: string, dto: CreateProjectDto) {
    const project = await this.projectsRepository.create({
      title: dto.title,
      description: dto.description,
      createdById: currentUserId,
    });

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      creator: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async list(
    currentUserId: string,
    currentUserRole: string,
    params: {
      page: number;
      limit: number;
      search?: string;
      sort?: string;
      order?: string;
    },
  ) {
    const { page, limit, search, sort, order } = params;
    const { projects, total } = await this.projectsRepository.findAll({
      page,
      limit,
      search,
      sort,
      order,
      userId: currentUserId,
      isAdmin: currentUserRole === 'ADMIN',
    });

    return {
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        creator: p.createdBy,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        memberCount: p._count.members,
        taskCount: p._count.tasks,
      })),
      total,
      page,
      limit,
    };
  }

  async findById(currentUserId: string, currentUserRole: string, id: string) {
    const project = await this.projectsRepository.findById(id);

    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Project not found',
        code: 'P-002',
      });
    }

    if (currentUserRole !== 'ADMIN') {
      const member = await this.projectsRepository.isMember(currentUserId, id);
      if (!member) {
        throw new ForbiddenException({
          status: 'error',
          message: 'You are not a member of this project',
          code: 'P-001',
        });
      }
    }

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      creator: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      members: project.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.user.role,
      })),
    };
  }

  async update(
    currentUserId: string,
    currentUserRole: string,
    id: string,
    dto: UpdateProjectDto,
  ) {
    const project = await this.projectsRepository.findById(id);

    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Project not found',
        code: 'P-002',
      });
    }

    if (currentUserRole !== 'ADMIN') {
      const member = await this.projectsRepository.isMember(currentUserId, id);
      if (!member) {
        throw new ForbiddenException({
          status: 'error',
          message: 'You are not a member of this project',
          code: 'P-001',
        });
      }
    }

    const data: { title?: string; description?: string } = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;

    const updated = await this.projectsRepository.update(id, data);

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      creator: updated.createdBy,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async delete(currentUserId: string, currentUserRole: string, id: string) {
    const project = await this.projectsRepository.findById(id);

    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Project not found',
        code: 'P-002',
      });
    }

    if (currentUserRole !== 'ADMIN') {
      const member = await this.projectsRepository.isMember(currentUserId, id);
      if (!member) {
        throw new ForbiddenException({
          status: 'error',
          message: 'You are not a member of this project',
          code: 'P-001',
        });
      }

      const creatorId = await this.projectsRepository.findProjectCreator(id);
      if (creatorId !== currentUserId) {
        throw new ForbiddenException({
          status: 'error',
          message: 'Cannot modify this resource',
          code: 'Z-002',
        });
      }
    }

    await this.projectsRepository.delete(id);
  }

  async addMember(
    currentUserRole: string,
    projectId: string,
    dto: AddMemberDto,
  ) {
    if (currentUserRole !== 'ADMIN') {
      throw new ForbiddenException({
        status: 'error',
        message: 'Insufficient permissions',
        code: 'Z-001',
      });
    }

    const project = await this.projectsRepository.findById(projectId);

    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Project not found',
        code: 'P-002',
      });
    }

    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user) {
      throw new NotFoundException({
        status: 'error',
        message: 'User not found',
        code: 'U-001',
      });
    }

    const existingMember = await this.projectsRepository.findMember(
      projectId,
      user.id,
    );

    if (existingMember) {
      throw new ConflictException({
        status: 'error',
        message: 'User is already a member',
        code: 'P-003',
      });
    }

    const membership = await this.projectsRepository.addMember(
      projectId,
      user.id,
    );

    return membership;
  }

  async removeMember(
    currentUserRole: string,
    projectId: string,
    targetUserId: string,
  ) {
    if (currentUserRole !== 'ADMIN') {
      throw new ForbiddenException({
        status: 'error',
        message: 'Insufficient permissions',
        code: 'Z-001',
      });
    }

    const project = await this.projectsRepository.findById(projectId);

    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Project not found',
        code: 'P-002',
      });
    }

    const targetUser = await this.usersRepository.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException({
        status: 'error',
        message: 'User not found',
        code: 'U-001',
      });
    }

    const creatorId = await this.projectsRepository.findProjectCreator(projectId);
    if (creatorId === targetUserId) {
      throw new ForbiddenException({
        status: 'error',
        message: 'Cannot remove the project creator',
        code: 'P-004',
      });
    }

    const member = await this.projectsRepository.findMember(
      projectId,
      targetUserId,
    );

    if (!member) {
      throw new NotFoundException({
        status: 'error',
        message: 'User is not a member of this project',
        code: 'P-005',
      });
    }

    await this.projectsRepository.removeMember(projectId, targetUserId);
  }
}
