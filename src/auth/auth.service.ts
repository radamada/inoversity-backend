import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {
    if (!config.get('JWT_ACCESS_SECRET') || !config.get('JWT_REFRESH_SECRET')) {
      throw new InternalServerErrorException(
        'JWT_ACCESS_SECRET și JWT_REFRESH_SECRET sunt obligatorii în variabilele de mediu',
      );
    }
  }

  async register(dto: RegisterDto) {
    if (!dto.termsAccepted) {
      throw new BadRequestException('Trebuie să accepți Termenii și Condițiile');
    }
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      password: dto.password,
      termsAccepted: dto.termsAccepted,
      termsAcceptedAt: dto.termsAccepted ? new Date() : undefined,
    });
    // Fire-and-forget welcome email
    this.mailService.sendWelcome(user.email, user.name).catch(() => null);
    return this.buildTokenPair(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Email sau parolă incorectă');
    if (!user.isActive) throw new UnauthorizedException('Contul este dezactivat');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Email sau parolă incorectă');

    return this.buildTokenPair(user);
  }

  async refresh(userId: string, email: string, role: string) {
    return this.buildTokenPair({ _id: userId, email, role } as any);
  }

  async forgotPassword(email: string): Promise<void> {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    await this.usersService.setPasswordResetToken(email, token, expires);
    // Fire-and-forget — don't reveal if email exists
    this.mailService.sendPasswordReset(email, token).catch(() => null);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.usersService.resetPassword(token, newPassword);
  }

  private buildTokenPair(user: UserDocument | { _id: any; email: string; role: string }) {
    const payload = {
      sub: (user as any)._id?.toString() ?? (user as any).sub,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return { accessToken, refreshToken, user };
  }
}
