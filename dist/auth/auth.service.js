"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const users_service_1 = require("../users/users.service");
const mail_service_1 = require("../mail/mail.service");
let AuthService = class AuthService {
    usersService;
    jwtService;
    config;
    mailService;
    constructor(usersService, jwtService, config, mailService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.config = config;
        this.mailService = mailService;
        if (!config.get('JWT_ACCESS_SECRET') || !config.get('JWT_REFRESH_SECRET')) {
            throw new common_1.InternalServerErrorException('JWT_ACCESS_SECRET și JWT_REFRESH_SECRET sunt obligatorii în variabilele de mediu');
        }
    }
    async register(dto) {
        if (!dto.termsAccepted) {
            throw new common_1.BadRequestException('Trebuie să accepți Termenii și Condițiile');
        }
        const user = await this.usersService.create({
            email: dto.email,
            name: dto.name,
            password: dto.password,
            termsAccepted: dto.termsAccepted,
            termsAcceptedAt: dto.termsAccepted ? new Date() : undefined,
        });
        this.mailService.sendWelcome(user.email, user.name).catch(() => null);
        return this.buildTokenPair(user);
    }
    async login(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user)
            throw new common_1.UnauthorizedException('Email sau parolă incorectă');
        if (!user.isActive)
            throw new common_1.UnauthorizedException('Contul este dezactivat');
        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Email sau parolă incorectă');
        return this.buildTokenPair(user);
    }
    async refresh(userId, email, role) {
        return this.buildTokenPair({ _id: userId, email, role });
    }
    async forgotPassword(email) {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 1 * 60 * 60 * 1000);
        await this.usersService.setPasswordResetToken(email, token, expires);
        this.mailService.sendPasswordReset(email, token).catch(() => null);
    }
    async resetPassword(token, newPassword) {
        await this.usersService.resetPassword(token, newPassword);
    }
    buildTokenPair(user) {
        const payload = {
            sub: user._id?.toString() ?? user.sub,
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map