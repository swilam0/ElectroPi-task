import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { title: string; description?: string; createdById: string }) {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          title: data.title,
          description: data.description,
          createdById: data.createdById,
        },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
      });

      await tx.projectMember.create({
        data: {
          userId: data.createdById,
          projectId: project.id,
        },
      });

      return project;
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    sort?: string;
    order?: string;
    userId?: string;
    isAdmin: boolean;
  }) {
    const { page, limit, search, sort, order, userId, isAdmin } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    if (!isAdmin && userId) {
      where.members = {
        some: { userId },
      };
    }

    const orderField = this.mapSortField(sort);
    const orderDir = order === 'asc' ? 'asc' : 'desc';

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderField]: orderDir },
        include: {
          _count: {
            select: {
              members: true,
              tasks: true,
            },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { projects, total };
  }

  async findById(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });
  }

  async update(id: string, data: { title?: string; description?: string }) {
    return this.prisma.project.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async isMember(userId: string, projectId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId, projectId },
      },
    });
    return !!member;
  }

  async findMember(projectId: string, userId: string) {
    return this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId, projectId },
      },
    });
  }

  async findProjectCreator(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { createdById: true },
    });
    return project?.createdById ?? null;
  }

  async delete(id: string) {
    return this.prisma.project.delete({
      where: { id },
    });
  }

  async addMember(projectId: string, userId: string) {
    return this.prisma.projectMember.create({
      data: {
        userId,
        projectId,
      },
    });
  }

  async removeMember(projectId: string, userId: string) {
    await this.prisma.task.updateMany({
      where: { projectId, assigneeId: userId },
      data: { assigneeId: null },
    });

    return this.prisma.projectMember.delete({
      where: {
        userId_projectId: { userId, projectId },
      },
    });
  }

  private mapSortField(sort?: string): string {
    const allowed = ['createdAt', 'title', 'updatedAt'];
    return allowed.includes(sort ?? '') ? sort! : 'createdAt';
  }
}
