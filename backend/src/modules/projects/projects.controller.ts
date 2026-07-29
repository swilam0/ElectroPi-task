import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string; role: string },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    const safeLimit = Math.min(limit, 100);
    const result = await this.projectsService.list(user.id, user.role, {
      page,
      limit: safeLimit,
      search,
      sort,
      order,
    });
    return {
      status: 'success',
      data: result.projects,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Post()
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.projectsService.create(user.id, dto);
    return { status: 'success', data: result };
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const result = await this.projectsService.findById(user.id, user.role, id);
    return { status: 'success', data: result };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const result = await this.projectsService.update(
      user.id,
      user.role,
      id,
      dto,
    );
    return { status: 'success', data: result };
  }

  @Delete(':id')
  @HttpCode(200)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    await this.projectsService.delete(user.id, user.role, id);
    return { status: 'success', data: null };
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: { role: string },
  ) {
    const result = await this.projectsService.addMember(user.role, id, dto);
    return { status: 'success', data: result };
  }

  @Delete(':id/members/:userId')
  @HttpCode(200)
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: { role: string },
  ) {
    await this.projectsService.removeMember(user.role, id, userId);
    return { status: 'success', data: null };
  }
}
