import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    title: string;
    description?: string;
    priority: string;
    dueDate?: string;
    assigneeId?: string;
    projectId: string;
    createdById: string;
  }) {
    return this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority as any,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        assigneeId: data.assigneeId,
        projectId: data.projectId,
        createdById: data.createdById,
      },
      include: {
        creator: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findByProject(
    projectId: string,
    params: {
      status?: string;
      priority?: string;
      assigneeId?: string;
      search?: string;
      page: number;
      limit: number;
      sort?: string;
      order?: string;
    },
  ) {
    const { page, limit, search, sort, order, status, priority, assigneeId } = params;
    const skip = (page - 1) * limit;

    const where: any = { projectId };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderField = this.mapSortField(sort);
    const orderDir = order === 'asc' ? 'asc' : 'desc';

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderField]: orderDir },
        include: {
          creator: {
            select: { id: true, name: true },
          },
          assignee: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return { tasks, total };
  }

  async findById(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      priority?: string;
      status?: string;
      dueDate?: Date;
      assigneeId?: string | null;
    },
  ) {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;

    return this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.task.delete({
      where: { id },
    });
  }

  private mapSortField(sort?: string): string {
    const allowed = ['createdAt', 'dueDate', 'priority', 'status'];
    return allowed.includes(sort ?? '') ? sort! : 'createdAt';
  }
}
