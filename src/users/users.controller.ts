import {
  Controller, Get, Patch, Post, Body, Param,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { MediaService } from '../media/media.service';
import { MailService } from '../mail/mail.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ConfirmEmailTokenDto } from './dto/confirm-email-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';
import { detectFileType } from '../common/utils/file-magic';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly mediaService: MediaService,
    private readonly mailService: MailService,
  ) {}

  // ── Public endpoints — no auth required ─────────────────────────────────
  @Get('instructors')
  listInstructors() {
    return this.usersService.listPublicInstructors();
  }

  @Get('instructors/:id')
  getInstructorProfile(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.getPublicInstructorProfile(id);
  }

  // ── Authenticated endpoints ──────────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user._id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user._id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  async changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user._id, dto);
  }

  @Throttle({ default: { ttl: 3_600_000, limit: 3 } })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('me/email')
  @ApiOperation({ summary: 'Solicită schimbarea adresei de email — max 3 cereri/oră' })
  async requestEmailChange(@CurrentUser() user: any, @Body() dto: ChangeEmailDto) {
    const token = await this.usersService.requestEmailChange(user._id, dto.newEmail, dto.currentPassword);
    // Fire-and-forget — nu blocăm răspunsul pentru trimiterea emailului
    this.mailService.sendEmailChangeOldConfirmation(user.email, token).catch(() => {});
    return { message: 'Un email de confirmare a fost trimis la adresa ta curentă' };
  }

  // Confirmarea schimbării de email se face prin POST (nu GET) pentru a preveni
  // declanșarea accidentală de prefetchers, link previews, web crawlers, <img>
  // tags sau alte mecanisme care emit GET-uri automate. FE-ul are pagini
  // dedicate (/email-change/confirm-{old,new}) care fac POST-ul din useEffect.
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @Post('email/confirm-old')
  @ApiOperation({ summary: 'Confirmă adresa veche de email (pasul 1)' })
  async confirmOldEmail(@Body() dto: ConfirmEmailTokenDto) {
    const { pendingEmail, token: sameToken } = await this.usersService.confirmOldEmailChange(dto.token);
    // Trimite email la noua adresă — fire-and-forget
    this.mailService.sendEmailChangeNewConfirmation(pendingEmail, sameToken).catch(() => {});
    return { message: 'Adresa curentă a fost confirmată. Verifică inbox-ul noii adrese de email.' };
  }

  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @Post('email/confirm-new')
  @ApiOperation({ summary: 'Confirmă noua adresă de email (pasul 2)' })
  async confirmNewEmail(@Body() dto: ConfirmEmailTokenDto) {
    const { message, oldEmail } = await this.usersService.confirmNewEmailChange(dto.token);
    // Notificăm adresa veche că schimbarea a fost finalizată
    this.mailService.sendEmailChangedNotification(oldEmail).catch(() => {});
    return { message };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload avatar utilizator pe CDN' })
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    if (!file) throw new BadRequestException('Niciun fișier primit');
    // Validăm prin magic bytes — file.mimetype e setat de client și nu e de încredere.
    // Asta închide bypass-ul: încărcare cu .heic + Content-Type forțat la image/heic.
    // SVG e respins by design (signature-ul lui nu apare în detectFileType).
    const detected = detectFileType(file.buffer);
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
    if (!detected || !allowedMimes.includes(detected)) {
      throw new BadRequestException('Format neacceptat. Sunt permise: JPEG, PNG, WebP, GIF, HEIC');
    }

    const newUrl = await this.mediaService.uploadImage(file.buffer, file.originalname, detected, 'avatars');

    // Șterge avatar-ul vechi de pe CDN (dacă era găzduit pe Bunny)
    const currentUser = await this.usersService.findById(user._id.toString());
    if (currentUser.avatar) {
      await this.mediaService.deleteImage(currentUser.avatar).catch(() => null);
    }

    return this.usersService.updateProfile(user._id.toString(), { avatar: newUrl });
  }
}
