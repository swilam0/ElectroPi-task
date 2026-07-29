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
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    const safeLimit = Math.min(limit, 100);
    const result = await this.usersService.list({ page, limit: safeLimit, search, role });
    return {
      status: 'success',
      data: result.users,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async findById(@Param('id') id: string) {
    const result = await this.usersService.findById(id);
    return { status: 'success', data: result };
  }

  @Patch(':id')
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const result = await this.usersService.updateProfile(
      user.id,
      user.role,
      id,
      dto,
    );
    return { status: 'success', data: result };
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const result = await this.usersService.changeRole(
      user.role,
      user.id,
      id,
      dto,
    );
    return { status: 'success', data: result };
  }

  @Patch(':id/password')
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const result = await this.usersService.changePassword(
      user.id,
      user.role,
      id,
      dto,
    );
    return { status: 'success', data: result };
  }

  @Delete(':id')
  @HttpCode(200)
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    await this.usersService.deleteUser(user.role, user.id, id);
    return { status: 'success', data: null };
  }
}
