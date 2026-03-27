import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private config;
    private readonly logger;
    private transporter;
    constructor(config: ConfigService);
    sendPasswordReset(to: string, token: string): Promise<void>;
    sendWelcome(to: string, name: string): Promise<void>;
    sendContactEmail(data: {
        name: string;
        email: string;
        subject: string;
        message: string;
    }): Promise<void>;
}
