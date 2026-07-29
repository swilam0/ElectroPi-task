import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('projects/:pid/tasks')
  async create(
    @Param('pid') projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.tasksService.create(user.id, projectId, dto);
    return { status: 'success', data: result };
  }

  @Get('projects/:pid/tasks')
  async list(
    @Param('pid') projectId: string,
    @Query() filters: TaskFilterDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const result = await this.tasksService.listByProject(
      user.id,
      user.role,
      projectId,
      filters,
    );
    return {
      status: 'success',
      data: result.tasks,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('tasks/:id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const result = await this.tasksService.findById(user.id, user.role, id);
    return { status: 'success', data: result };
  }

  @Patch('tasks/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const result = await this.tasksService.update(user.id, user.role, id, dto);
    return { status: 'success', data: result };
  }

  @Delete('tasks/:id')
  @HttpCode(200)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    await this.tasksService.delete(user.id, user.role, id);
    return { status: 'success', data: null };
  }
}
