import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ContactDto } from './contact.dto';
import { MailService } from '../mail/mail.service';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly mailService: MailService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trimite un mesaj de contact' })
  async sendMessage(@Body() dto: ContactDto) {
    await this.mailService.sendContactEmail(dto);
    return { success: true };
  }
}
