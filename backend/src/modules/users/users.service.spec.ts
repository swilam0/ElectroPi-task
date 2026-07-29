import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { createMockUser } from '../../common/test/factories';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    usersRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      updateRole: jest.fn(),
      updatePassword: jest.fn(),
      findByIdWithPassword: jest.fn(),
      countOwnedProjects: jest.fn(),
      countOwnedTasks: jest.fn(),
      delete: jest.fn(),
    } as any;

    configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = { BCRYPT_SALT_ROUNDS: 12 };
        return config[key] ?? defaultValue;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('list', () => {
    it('should return paginated users', async () => {
      const users = [createMockUser(), createMockUser()];
      usersRepository.findAll.mockResolvedValue({ users, total: 2 });

      const result = await service.list({ page: 1, limit: 20 });

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should pass search and role filters to repository', async () => {
      usersRepository.findAll.mockResolvedValue({ users: [], total: 0 });

      await service.list({ page: 1, limit: 20, search: 'alice', role: 'ADMIN' });

      expect(usersRepository.findAll).toHaveBeenCalledWith({
        page: 1, limit: 20, search: 'alice', role: 'ADMIN',
      });
    });
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      const user = createMockUser({ id: 'user-1' });
      usersRepository.findById.mockResolvedValue(user);

      const result = await service.findById('user-1');

      expect(result.id).toBe('user-1');
    });

    it('should throw U-001 when user not found', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.findById('unknown')).rejects.toThrow(
        new NotFoundException({ status: 'error', message: 'User not found', code: 'U-001' }),
      );
    });
  });

  describe('updateProfile', () => {
    const targetUser = createMockUser({ id: 'target-1', email: 'old@test.com', name: 'Old Name' });

    it('should allow user to update own profile', async () => {
      usersRepository.findById.mockResolvedValue(targetUser);
      usersRepository.update.mockResolvedValue({ ...targetUser, name: 'New Name' });

      const dto: UpdateUserDto = { name: 'New Name' };
      const result = await service.updateProfile('target-1', 'MEMBER', 'target-1', dto);

      expect(result.name).toBe('New Name');
      expect(usersRepository.update).toHaveBeenCalledWith('target-1', { name: 'New Name' });
    });

    it('should allow ADMIN to update any user', async () => {
      usersRepository.findById.mockResolvedValue(targetUser);
      usersRepository.update.mockResolvedValue({ ...targetUser, name: 'Admin Set' });

      const dto: UpdateUserDto = { name: 'Admin Set' };
      const result = await service.updateProfile('admin-id', 'ADMIN', 'target-1', dto);

      expect(result.name).toBe('Admin Set');
    });

    it('should throw Z-002 when MEMBER tries to update another user', async () => {
      usersRepository.findById.mockResolvedValue(targetUser);

      const dto: UpdateUserDto = { name: 'Hacked Name' };
      await expect(
        service.updateProfile('other-member', 'MEMBER', 'target-1', dto),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'Cannot modify this resource', code: 'Z-002' }),
      );
    });

    it('should enforce email uniqueness (A-003)', async () => {
      usersRepository.findById.mockResolvedValue(targetUser);
      usersRepository.findByEmail.mockResolvedValue(createMockUser({ id: 'other-user' }));

      const dto: UpdateUserDto = { email: 'taken@test.com' };
      await expect(
        service.updateProfile('target-1', 'MEMBER', 'target-1', dto),
      ).rejects.toThrow(
        new BadRequestException({ status: 'error', message: 'Validation failed', code: 'A-003' }),
      );
    });

    it('should throw U-001 when target user not found', async () => {
      usersRepository.findById.mockResolvedValue(null);

      const dto: UpdateUserDto = { name: 'New Name' };
      await expect(
        service.updateProfile('admin-id', 'ADMIN', 'unknown', dto),
      ).rejects.toThrow(
        new NotFoundException({ status: 'error', message: 'User not found', code: 'U-001' }),
      );
    });
  });

  describe('changeRole', () => {
    const targetUser = createMockUser({ id: 'target-1', role: 'MEMBER' });

    it('should allow ADMIN to change another user role', async () => {
      usersRepository.findById.mockResolvedValue(targetUser);
      usersRepository.updateRole.mockResolvedValue({ ...targetUser, role: 'ADMIN' });

      const dto: ChangeRoleDto = { role: 'ADMIN' };
      const result = await service.changeRole('ADMIN', 'admin-id', 'target-1', dto);

      expect(result.role).toBe('ADMIN');
    });

    it('should throw Z-001 when MEMBER tries to change role', async () => {
      const dto: ChangeRoleDto = { role: 'ADMIN' };
      await expect(
        service.changeRole('MEMBER', 'member-id', 'target-1', dto),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'Insufficient permissions', code: 'Z-001' }),
      );
    });

    it('should throw Z-003 when ADMIN tries to change own role', async () => {
      const dto: ChangeRoleDto = { role: 'MEMBER' };
      await expect(
        service.changeRole('ADMIN', 'admin-id', 'admin-id', dto),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'Cannot perform this action on yourself', code: 'Z-003' }),
      );
    });

    it('should throw U-001 when target user not found', async () => {
      usersRepository.findById.mockResolvedValue(null);

      const dto: ChangeRoleDto = { role: 'ADMIN' };
      await expect(
        service.changeRole('ADMIN', 'admin-id', 'unknown', dto),
      ).rejects.toThrow(
        new NotFoundException({ status: 'error', message: 'User not found', code: 'U-001' }),
      );
    });
  });

  describe('changePassword', () => {
    const targetUser = createMockUser({
      id: 'target-1',
      password: bcrypt.hashSync('OldPass123!', 12),
    });

    it('should allow self-service password change with correct currentPassword', async () => {
      usersRepository.findByIdWithPassword.mockResolvedValue(targetUser);
      usersRepository.updatePassword.mockResolvedValue(targetUser as any);

      const dto: ChangePasswordDto = { currentPassword: 'OldPass123!', newPassword: 'NewPass123!' };
      const result = await service.changePassword('target-1', 'MEMBER', 'target-1', dto);

      expect(result.message).toBe('Password updated successfully');
      expect(usersRepository.updatePassword).toHaveBeenCalled();
    });

    it('should throw A-003 when currentPassword is wrong', async () => {
      usersRepository.findByIdWithPassword.mockResolvedValue(targetUser);

      const dto: ChangePasswordDto = { currentPassword: 'WrongOldPass!', newPassword: 'NewPass123!' };
      await expect(
        service.changePassword('target-1', 'MEMBER', 'target-1', dto),
      ).rejects.toThrow(
        new BadRequestException({ status: 'error', message: 'Validation failed', code: 'A-003' }),
      );
    });

    it('should allow ADMIN to reset password without currentPassword', async () => {
      usersRepository.findByIdWithPassword.mockResolvedValue(targetUser);
      usersRepository.updatePassword.mockResolvedValue(targetUser as any);

      const dto: ChangePasswordDto = { newPassword: 'AdminSet123!' };
      const result = await service.changePassword('admin-id', 'ADMIN', 'target-1', dto);

      expect(result.message).toBe('Password updated successfully');
    });

    it('should throw Z-002 when MEMBER tries to change another user password', async () => {
      usersRepository.findByIdWithPassword.mockResolvedValue(targetUser);

      const dto: ChangePasswordDto = { newPassword: 'Hack123!' };
      await expect(
        service.changePassword('member-id', 'MEMBER', 'target-1', dto),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'Cannot modify this resource', code: 'Z-002' }),
      );
    });
  });

  describe('deleteUser', () => {
    const targetUser = createMockUser({ id: 'target-1' });

    it('should allow ADMIN to delete another user', async () => {
      usersRepository.findById.mockResolvedValue(targetUser);
      usersRepository.countOwnedProjects.mockResolvedValue(0);
      usersRepository.countOwnedTasks.mockResolvedValue(0);
      usersRepository.delete.mockResolvedValue(targetUser as any);

      await service.deleteUser('ADMIN', 'admin-id', 'target-1');

      expect(usersRepository.delete).toHaveBeenCalledWith('target-1');
    });

    it('should throw Z-001 when MEMBER tries to delete', async () => {
      await expect(
        service.deleteUser('MEMBER', 'member-id', 'target-1'),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'Insufficient permissions', code: 'Z-001' }),
      );
    });

    it('should throw Z-003 when ADMIN tries to delete self', async () => {
      await expect(
        service.deleteUser('ADMIN', 'admin-id', 'admin-id'),
      ).rejects.toThrow(
        new ForbiddenException({ status: 'error', message: 'Cannot perform this action on yourself', code: 'Z-003' }),
      );
    });

    it('should throw U-002 when user has owned projects', async () => {
      usersRepository.findById.mockResolvedValue(targetUser);
      usersRepository.countOwnedProjects.mockResolvedValue(2);
      usersRepository.countOwnedTasks.mockResolvedValue(0);

      await expect(
        service.deleteUser('ADMIN', 'admin-id', 'target-1'),
      ).rejects.toThrow(
        new ConflictException({ status: 'error', message: 'User has active projects', code: 'U-002' }),
      );
    });

    it('should throw U-002 when user has owned tasks', async () => {
      usersRepository.findById.mockResolvedValue(targetUser);
      usersRepository.countOwnedProjects.mockResolvedValue(0);
      usersRepository.countOwnedTasks.mockResolvedValue(3);

      await expect(
        service.deleteUser('ADMIN', 'admin-id', 'target-1'),
      ).rejects.toThrow(
        new ConflictException({ status: 'error', message: 'User has active projects', code: 'U-002' }),
      );
    });
  });
});
