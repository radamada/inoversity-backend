import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserDocument } from '../users/schemas/user.schema';
export declare class AuthService {
    private usersService;
    private jwtService;
    private config;
    private mailService;
    constructor(usersService: UsersService, jwtService: JwtService, config: ConfigService, mailService: MailService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: UserDocument | {
            _id: any;
            email: string;
            role: string;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: UserDocument | {
            _id: any;
            email: string;
            role: string;
        };
    }>;
    refresh(userId: string, email: string, role: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: UserDocument | {
            _id: any;
            email: string;
            role: string;
        };
    }>;
    forgotPassword(email: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
    private buildTokenPair;
}
