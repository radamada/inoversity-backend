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
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
let MailService = MailService_1 = class MailService {
    config;
    logger = new common_1.Logger(MailService_1.name);
    transporter;
    constructor(config) {
        this.config = config;
        this.transporter = nodemailer.createTransport({
            host: config.get('SMTP_HOST', 'smtp.gmail.com'),
            port: config.get('SMTP_PORT', 587),
            secure: false,
            auth: {
                user: config.get('SMTP_USER'),
                pass: config.get('SMTP_PASS'),
            },
        });
    }
    async sendPasswordReset(to, token) {
        const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
        const resetUrl = `${frontendUrl}/reset-password/${token}`;
        const from = this.config.get('SMTP_FROM', 'EduInovatrium <noreply@eduinovatrium.ro>');
        try {
            await this.transporter.sendMail({
                from,
                to,
                subject: 'Resetare parolă EduInovatrium',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4f46e5, #3730a3); padding: 32px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">EduInovatrium</h1>
            </div>
            <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #111827; margin-top: 0;">Resetare parolă</h2>
              <p style="color: #6b7280;">Ai solicitat resetarea parolei pentru contul tău EduInovatrium. Apasă butonul de mai jos pentru a seta o parolă nouă.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}"
                   style="background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Resetează parola
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 14px;">Link-ul este valabil 1 oră. Dacă nu ai solicitat resetarea parolei, ignoră acest email.</p>
              <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">Sau copiază URL-ul: <a href="${resetUrl}" style="color: #4f46e5;">${resetUrl}</a></p>
            </div>
          </div>
        `,
            });
        }
        catch (err) {
            this.logger.error('Failed to send password reset email', err);
        }
    }
    async sendWelcome(to, name) {
        const from = this.config.get('SMTP_FROM', 'EduInovatrium <noreply@eduinovatrium.ro>');
        const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
        try {
            await this.transporter.sendMail({
                from,
                to,
                subject: 'Bine ai venit pe EduInovatrium!',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4f46e5, #3730a3); padding: 32px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">EduInovatrium</h1>
            </div>
            <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #111827; margin-top: 0;">Bine ai venit, ${name}!</h2>
              <p style="color: #6b7280;">Contul tău a fost creat cu succes. Explorează sute de cursuri premium și începe să înveți azi.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${frontendUrl}"
                   style="background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Explorează cursuri
                </a>
              </div>
            </div>
          </div>
        `,
            });
        }
        catch (err) {
            this.logger.error('Failed to send welcome email', err);
        }
    }
    async sendContactEmail(data) {
        const from = this.config.get('SMTP_FROM', 'EduInovatrium <noreply@eduinovatrium.ro>');
        const to = this.config.get('CONTACT_EMAIL', 'admin@eduinovatrium.ro');
        const safeName = escapeHtml(data.name);
        const safeEmail = escapeHtml(data.email);
        const safeSubject = escapeHtml(data.subject);
        const safeMessage = escapeHtml(data.message);
        await this.transporter.sendMail({
            from,
            replyTo: data.email,
            to,
            subject: `[Contact EduInovatrium] ${data.subject}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4f46e5, #3730a3); padding: 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">EduInovatrium — Mesaj nou</h1>
          </div>
          <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="color: #374151;"><strong>De la:</strong> ${safeName} &lt;${safeEmail}&gt;</p>
            <p style="color: #374151;"><strong>Subiect:</strong> ${safeSubject}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <p style="color: #374151; white-space: pre-line;">${safeMessage}</p>
          </div>
        </div>
      `,
        });
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map