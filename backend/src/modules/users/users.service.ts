import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
  ) {}

  async list(params: { page: number; limit: number; search?: string; role?: string }) {
    const { page, limit, search, role } = params;
    const { users, total } = await this.usersRepository.findAll({
      page,
      limit,
      search,
      role,
    });

    return { users, total, page, limit };
  }

  async findById(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException({
        status: 'error',
        message: 'User not found',
        code: 'U-001',
      });
    }

    return user;
  }

  async updateProfile(
    currentUserId: string,
    currentUserRole: string,
    targetUserId: string,
    dto: UpdateUserDto,
  ) {
    const targetUser = await this.usersRepository.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException({
        status: 'error',
        message: 'User not found',
        code: 'U-001',
      });
    }

    if (currentUserRole !== 'ADMIN' && currentUserId !== targetUserId) {
      throw new ForbiddenException({
        status: 'error',
        message: 'Cannot modify this resource',
        code: 'Z-002',
      });
    }

    if (dto.email && dto.email !== targetUser.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing) {
        throw new BadRequestException({
          status: 'error',
          message: 'Validation failed',
          code: 'A-003',
        });
      }
    }

    const data: { name?: string; email?: string } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;

    const updated = await this.usersRepository.update(targetUserId, data);

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
    };
  }

  async changeRole(
    currentUserRole: string,
    currentUserId: string,
    targetUserId: string,
    dto: ChangeRoleDto,
  ) {
    if (currentUserRole !== 'ADMIN') {
      throw new ForbiddenException({
        status: 'error',
        message: 'Insufficient permissions',
        code: 'Z-001',
      });
    }

    if (currentUserId === targetUserId) {
      throw new ForbiddenException({
        status: 'error',
        message: 'Cannot perform this action on yourself',
        code: 'Z-003',
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

    const updated = await this.usersRepository.updateRole(targetUserId, dto.role);

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
    };
  }

  async changePassword(
    currentUserId: string,
    currentUserRole: string,
    targetUserId: string,
    dto: ChangePasswordDto,
  ) {
    const targetUser = await this.usersRepository.findByIdWithPassword(targetUserId);

    if (!targetUser) {
      throw new NotFoundException({
        status: 'error',
        message: 'User not found',
        code: 'U-001',
      });
    }

    if (currentUserRole !== 'ADMIN' && currentUserId !== targetUserId) {
      throw new ForbiddenException({
        status: 'error',
        message: 'Cannot modify this resource',
        code: 'Z-002',
      });
    }

    if (currentUserId === targetUserId) {
      if (!dto.currentPassword) {
        throw new BadRequestException({
          status: 'error',
          message: 'Validation failed',
          code: 'A-003',
        });
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        dto.currentPassword,
        targetUser.password,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException({
          status: 'error',
          message: 'Validation failed',
          code: 'A-003',
        });
      }
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const hashedPassword = await bcrypt.hash(dto.newPassword, saltRounds);

    await this.usersRepository.updatePassword(targetUserId, hashedPassword);

    return { message: 'Password updated successfully' };
  }

  async deleteUser(
    currentUserRole: string,
    currentUserId: string,
    targetUserId: string,
  ) {
    if (currentUserRole !== 'ADMIN') {
      throw new ForbiddenException({
        status: 'error',
        message: 'Insufficient permissions',
        code: 'Z-001',
      });
    }

    if (currentUserId === targetUserId) {
      throw new ForbiddenException({
        status: 'error',
        message: 'Cannot perform this action on yourself',
        code: 'Z-003',
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

    const [ownedProjects, ownedTasks] = await Promise.all([
      this.usersRepository.countOwnedProjects(targetUserId),
      this.usersRepository.countOwnedTasks(targetUserId),
    ]);

    if (ownedProjects > 0 || ownedTasks > 0) {
      throw new ConflictException({
        status: 'error',
        message: 'User has active projects',
        code: 'U-002',
      });
    }

    await this.usersRepository.delete(targetUserId);
  }
}
