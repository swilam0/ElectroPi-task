import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsRepository } from '../projects/projects.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { StatusTransitionValidator } from './status-transition.validator';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  private readonly statusTransitionValidator: StatusTransitionValidator;

  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly projectsRepository: ProjectsRepository,
  ) {
    this.statusTransitionValidator = new StatusTransitionValidator();
  }

  async create(
    currentUserId: string,
    projectId: string,
    dto: CreateTaskDto,
  ) {
    const project = await this.projectsRepository.findById(projectId);

    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Project not found',
        code: 'P-002',
      });
    }

    const isMember = await this.projectsRepository.isMember(currentUserId, projectId);
    if (!isMember) {
      throw new ForbiddenException({
        status: 'error',
        message: 'You are not a member of this project',
        code: 'P-001',
      });
    }

    if (dto.assigneeId) {
      const isAssigneeMember = await this.projectsRepository.isMember(
        dto.assigneeId,
        projectId,
      );
      if (!isAssigneeMember) {
        throw new BadRequestException({
          status: 'error',
          message: 'Assignee is not a member of this project',
          code: 'T-001',
        });
      }
    }

    const task = await this.tasksRepository.create({
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      dueDate: dto.dueDate,
      assigneeId: dto.assigneeId,
      projectId,
      createdById: currentUserId,
    });

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      projectId: task.projectId,
      creator: task.creator,
      assignee: task.assignee,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async listByProject(
    currentUserId: string,
    currentUserRole: string,
    projectId: string,
    filters: {
      status?: string;
      priority?: string;
      assigneeId?: string;
      search?: string;
      page?: number;
      limit?: number;
      sort?: string;
      order?: string;
    },
  ) {
    const project = await this.projectsRepository.findById(projectId);

    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Project not found',
        code: 'P-002',
      });
    }

    if (currentUserRole !== 'ADMIN') {
      const isMember = await this.projectsRepository.isMember(currentUserId, projectId);
      if (!isMember) {
        throw new ForbiddenException({
          status: 'error',
          message: 'You are not a member of this project',
          code: 'P-001',
        });
      }
    }

    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    const { tasks, total } = await this.tasksRepository.findByProject(projectId, {
      status: filters.status,
      priority: filters.priority,
      assigneeId: filters.assigneeId,
      search: filters.search,
      page,
      limit,
      sort: filters.sort,
      order: filters.order,
    });

    return {
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        projectId: t.projectId,
        creator: t.creator,
        assignee: t.assignee,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      total,
      page,
      limit,
    };
  }

  async findById(
    currentUserId: string,
    currentUserRole: string,
    id: string,
  ) {
    const task = await this.tasksRepository.findById(id);

    if (!task) {
      throw new NotFoundException({
        status: 'error',
        message: 'Task not found',
        code: 'T-002',
      });
    }

    if (currentUserRole !== 'ADMIN') {
      const isMember = await this.projectsRepository.isMember(
        currentUserId,
        task.projectId,
      );
      if (!isMember) {
        throw new NotFoundException({
          status: 'error',
          message: 'Task not found',
          code: 'T-002',
        });
      }
    }

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      projectId: task.projectId,
      creator: task.creator,
      assignee: task.assignee,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async update(
    currentUserId: string,
    currentUserRole: string,
    taskId: string,
    dto: UpdateTaskDto,
  ) {
    const task = await this.tasksRepository.findById(taskId);

    if (!task) {
      throw new NotFoundException({
        status: 'error',
        message: 'Task not found',
        code: 'T-002',
      });
    }

    if (currentUserRole !== 'ADMIN') {
      const isMember = await this.projectsRepository.isMember(
        currentUserId,
        task.projectId,
      );
      if (!isMember) {
        throw new ForbiddenException({
          status: 'error',
          message: 'You are not a member of this project',
          code: 'P-001',
        });
      }
    }

    const data: {
      title?: string;
      description?: string;
      priority?: string;
      status?: string;
      dueDate?: Date;
      assigneeId?: string | null;
    } = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.dueDate !== undefined) data.dueDate = new Date(dto.dueDate);

    let effectiveAssigneeId = task.assigneeId;

    if (dto.assigneeId !== undefined) {
      if (dto.assigneeId === null) {
        if (task.status === 'DONE' && currentUserRole !== 'ADMIN') {
          throw new ForbiddenException({
            status: 'error',
            message: 'Cannot modify this resource',
            code: 'Z-002',
          });
        }
        data.assigneeId = null;
        effectiveAssigneeId = null;
      } else {
        const isNewAssigneeMember = await this.projectsRepository.isMember(
          dto.assigneeId,
          task.projectId,
        );
        if (!isNewAssigneeMember) {
          throw new BadRequestException({
            status: 'error',
            message: 'Assignee is not a member of this project',
            code: 'T-001',
          });
        }
        data.assigneeId = dto.assigneeId;
        effectiveAssigneeId = dto.assigneeId;
      }
    }

    if (dto.status !== undefined && dto.status !== task.status) {
      this.statusTransitionValidator.validate(
        task.status,
        dto.status,
        currentUserRole,
        currentUserId,
        task.createdById,
        effectiveAssigneeId,
      );
      data.status = dto.status;
    }

    if (Object.keys(data).length === 0) {
      const updated = await this.tasksRepository.findById(taskId);
      return {
        id: updated!.id,
        title: updated!.title,
        description: updated!.description,
        status: updated!.status,
        priority: updated!.priority,
        dueDate: updated!.dueDate,
        projectId: updated!.projectId,
        creator: updated!.creator,
        assignee: updated!.assignee,
        createdAt: updated!.createdAt,
        updatedAt: updated!.updatedAt,
      };
    }

    const updated = await this.tasksRepository.update(taskId, data);

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      priority: updated.priority,
      dueDate: updated.dueDate,
      projectId: updated.projectId,
      creator: updated.creator,
      assignee: updated.assignee,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async delete(
    currentUserId: string,
    currentUserRole: string,
    id: string,
  ) {
    const task = await this.tasksRepository.findById(id);

    if (!task) {
      throw new NotFoundException({
        status: 'error',
        message: 'Task not found',
        code: 'T-002',
      });
    }

    if (currentUserRole !== 'ADMIN') {
      const isMember = await this.projectsRepository.isMember(
        currentUserId,
        task.projectId,
      );
      if (!isMember) {
        throw new ForbiddenException({
          status: 'error',
          message: 'You are not a member of this project',
          code: 'P-001',
        });
      }

      if (task.createdById !== currentUserId) {
        throw new ForbiddenException({
          status: 'error',
          message: 'Cannot modify this resource',
          code: 'Z-002',
        });
      }
    }

    await this.tasksRepository.delete(id);
  }
}
