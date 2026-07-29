import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(email: string, password: string, name: string) {
    return this.prisma.user.create({
      data: { email, password, name },
    });
  }

  async updateFailedAttempts(userId: string, attempts: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: attempts },
    });
  }

  async setLockedUntil(userId: string, until: Date | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: until },
    });
  }

  async createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findRefreshTokenByHash(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
  }

  async deleteRefreshToken(id: string) {
    return this.prisma.refreshToken.delete({
      where: { id },
    });
  }

  async deleteAllRefreshTokensForUser(userId: string) {
    return this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
