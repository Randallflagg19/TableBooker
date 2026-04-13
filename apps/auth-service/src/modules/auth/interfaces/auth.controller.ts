import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../application/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserData } from '../infrastructure/jwt-payload.type';
import { AuthRateLimitService } from '../application/auth-rate-limit.service';
import type { Request, Response } from 'express';

const REFRESH_COOKIE_NAME = 'tablebooker_refresh_token';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: false,
  path: '/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

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
  public async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authRateLimitService.check('login', req.ip ?? 'unknown');

    const result = await this.authService.login(dto);

    res.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      REFRESH_COOKIE_OPTIONS,
    );

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  public async refresh(@Req() req: Request) {
    await this.authRateLimitService.check('refresh', req.ip ?? 'unknown');

    const rawRefreshToken: unknown = req.cookies?.[REFRESH_COOKIE_NAME];

    if (typeof rawRefreshToken !== 'string' || rawRefreshToken.length === 0) {
      throw new UnauthorizedException('Missing refresh token');
    }

    return this.authService.refresh(rawRefreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  public async logout(
    @CurrentUser() user: CurrentUserData,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);

    return this.authService.logout(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  public me(@CurrentUser() user: CurrentUserData) {
    return user;
  }
}
