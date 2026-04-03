import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', 'smtp.gmail.com'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASS'),
      },
    });
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
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
    } catch (err) {
      this.logger.error('Failed to send password reset email', err);
      // Don't throw — silently fail so we don't leak user existence info
    }
  }

  async sendWelcome(to: string, name: string): Promise<void> {
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
              <h2 style="color: #111827; margin-top: 0;">Bine ai venit, ${escapeHtml(name)}!</h2>
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
    } catch (err) {
      this.logger.error('Failed to send welcome email', err);
    }
  }

  async sendContactEmail(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void> {
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
}
