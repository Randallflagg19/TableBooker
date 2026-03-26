import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../application/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserData } from '../infrastructure/jwt-payload.type';
import { AuthRateLimitService } from '../application/auth-rate-limit.service';
import type { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authRateLimitService: AuthRateLimitService,
  ) {}

  @Post('register')
  public async register(@Body() dto: RegisterDto, @Req() req: Request) {
    await this.authRateLimitService.check('register', req.ip ?? 'unknown');
    return this.authService.register(dto);
  }

  @Post('login')
  public async login(@Body() dto: LoginDto, @Req() req: Request) {
    await this.authRateLimitService.check('login', req.ip ?? 'unknown');
    return this.authService.login(dto);
  }

  @Post('refresh')
  public async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    await this.authRateLimitService.check('refresh', req.ip ?? 'unknown');
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  public async logout(@CurrentUser() user: CurrentUserData) {
    return this.authService.logout(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  public me(@CurrentUser() user: CurrentUserData) {
    return user;
  }
}
