import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';
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
  @Throttle({ default: { ttl: 60000, limit: 3 } })
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

  // GET /clear-session was removed: state-changing endpoints must not be
  // reachable via GET (CSRF — `<img src=...>`, prefetch, link preview can
  // trigger a logout). Frontend uses POST /clear-session exclusively.

  // ── Google OAuth ──────────────────────────────────────────────────────────

  /**
   * Initiate Google OAuth flow.
   * Frontend navigates to: GET /api/auth/google
   * Optional query param ?from=/some-path is stored in sessionStorage by the
   * frontend before navigating here, so it survives the OAuth round-trip.
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport redirects to Google — nothing to return here
  }

  /**
   * Google redirects back here after the user consents.
   * Sets cookies and redirects the browser to the frontend callback page
   * which reads the one-time access token from the URL and stores it in memory.
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    if (!req.user) {
      return (res as any).redirect(`${frontendUrl}/login?error=google_failed`);
    }

    try {
      const result = await this.authService.loginWithGoogle(req.user);
      this.setRefreshCookie(res, result.refreshToken);
      this.setRoleCookie(res, result.user.role);
      // Pass access token to frontend via URL — the callback page reads it
      // immediately and removes it from the URL (replaceState) so it never
      // sits in browser history.
      (res as any).redirect(
        `${frontendUrl}/auth/google/callback?token=${result.accessToken}`,
      );
    } catch {
      (res as any).redirect(`${frontendUrl}/login?error=google_failed`);
    }
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
    delete u.passwordResetExpires;
    delete u.emailVerificationToken;
    delete u.tokenVersion;
    delete u.emailChangeToken;
    delete u.emailChangeTokenExpires;
    delete u.emailChangeOldConfirmed;
    return u;
  }
}
