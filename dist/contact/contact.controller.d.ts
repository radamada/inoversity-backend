import { ContactDto } from './contact.dto';
import { MailService } from '../mail/mail.service';
export declare class ContactController {
    private readonly mailService;
    constructor(mailService: MailService);
    sendMessage(dto: ContactDto): Promise<{
        success: boolean;
    }>;
}
