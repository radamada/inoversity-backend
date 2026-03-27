import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, res: Response): Promise<{
        accessToken: string;
        user: any;
    }>;
    login(dto: LoginDto, res: Response): Promise<{
        accessToken: string;
        user: any;
    }>;
    refresh(user: any, res: Response): Promise<{
        accessToken: string;
    }>;
    logout(res: Response): {
        message: string;
    };
    me(user: any): any;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(token: string, dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    private setRefreshCookie;
    private setRoleCookie;
    private sanitizeUser;
}
