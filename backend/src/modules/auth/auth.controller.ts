import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(200)
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return { status: 'success', data: result };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto.email, dto.password);
    return { status: 'success', data: result };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshDto) {
    const result = await this.authService.refresh(dto.refreshToken);
    return { status: 'success', data: result };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Body() dto: RefreshDto,
    @CurrentUser() user: { id: string; jti: string; exp: number },
  ) {
    await this.authService.logout(user.id, user.jti, dto.refreshToken, user.exp);
    return { status: 'success', data: null };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { id: string }) {
    const result = await this.authService.me(user.id);
    return { status: 'success', data: result };
  }
}
