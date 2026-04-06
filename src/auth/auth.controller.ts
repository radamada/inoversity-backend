import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import {
  COOKIE_NAMES,
  REFRESH_COOKIE_OPTIONS,
  REFRESH_COOKIE_CLEAR_OPTIONS,
  ROLE_COOKIE_OPTIONS,
  ROLE_COOKIE_CLEAR_OPTIONS,
} from './cookie-names.const';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Înregistrare utilizator nou' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    this.setRoleCookie(res, result.user.role);
    return { accessToken: result.accessToken, user: this.sanitizeUser(result.user) };
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentificare' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    this.setRoleCookie(res, result.user.role);
    return { accessToken: result.accessToken, user: this.sanitizeUser(result.user) };
  }

  @Post('clear-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Șterge cookies de sesiune (fără autentificare)' })
  clearSession(@Res({ passthrough: true }) res: Response) {
    this.clearAuthCookies(res);
    return { ok: true };
  }

  @Get('clear-session')
  @HttpCode(HttpStatus.OK)
  clearSessionGet(@Res() res: Response) {
    this.clearAuthCookies(res as any);
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    (res as any).redirect(`${frontendUrl}/login`);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({ summary: 'Reînnoire access token' })
  async refresh(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.authService.refresh(user.sub, user.email, user.role, user.tokenVersion ?? 0);
      this.setRefreshCookie(res, result.refreshToken);
      return { accessToken: result.accessToken };
    } catch {
      this.clearAuthCookies(res);
      throw new UnauthorizedException('Sesiune expirată');
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({ summary: 'Delogare' })
  async logout(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    if (user?.sub) {
      await this.authService.logout(user.sub);
    }
    this.clearAuthCookies(res);
    return { message: 'Delogat cu succes' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Date utilizator curent' })
  me(@CurrentUser() user: any) {
    return this.sanitizeUser(user);
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'Dacă emailul există, vei primi instrucțiuni de resetare' };
  }

  @Post('reset-password/:token')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Param('token') token: string, @Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(token, dto.password);
    return { message: 'Parola a fost resetată cu succes' };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(COOKIE_NAMES.refreshToken, token, REFRESH_COOKIE_OPTIONS);
  }

  private setRoleCookie(res: Response, role: string): void {
    res.cookie(COOKIE_NAMES.userRole, role, ROLE_COOKIE_OPTIONS);
  }

  /**
   * Clears both auth cookies.
   * Also clears the old plain names (without __Host- prefix) during the
   * transition period so lingering dev/pre-deploy sessions are cleaned up.
   */
  private clearAuthCookies(res: Response): void {
    res.clearCookie(COOKIE_NAMES.refreshToken, REFRESH_COOKIE_CLEAR_OPTIONS);
    res.clearCookie(COOKIE_NAMES.userRole, ROLE_COOKIE_CLEAR_OPTIONS);
    // Safety net: also clear legacy plain names if they differ (prod with __Host- prefix)
    if (COOKIE_NAMES.refreshToken !== 'refresh_token') {
      res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
      res.clearCookie('refresh_token', { path: '/' });
    }
    if (COOKIE_NAMES.userRole !== 'user_role') {
      res.clearCookie('user_role', { path: '/' });
    }
  }

  private sanitizeUser(user: any) {
    const u = user?.toObject ? user.toObject() : { ...user };
    delete u.passwordHash;
    delete u.passwordResetToken;
    delete u.emailVerificationToken;
    return u;
  }
}
