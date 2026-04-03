import {
  Controller, Get, Patch, Post, Body, Param,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { MediaService } from '../media/media.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly mediaService: MediaService,
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload avatar utilizator pe CDN' })
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    if (!file) throw new BadRequestException('Niciun fișier primit');
    const isHeic = file.originalname.toLowerCase().match(/\.(heic|heif)$/);
    // Normalize HEIC detected by extension
    if (isHeic && !file.mimetype.startsWith('image/')) file.mimetype = 'image/heic';
    // Explicit allowlist — SVG is blocked (stored XSS vector via embedded JavaScript)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heic-sequence', 'image/heif'];
    if (!allowedMimes.includes(file.mimetype) && !isHeic) {
      throw new BadRequestException('Format neacceptat. Sunt permise: JPEG, PNG, WebP, GIF, HEIC');
    }

    const newUrl = await this.mediaService.uploadImage(file.buffer, file.originalname, file.mimetype, 'avatars');

    // Șterge avatar-ul vechi de pe CDN (dacă era găzduit pe Bunny)
    const currentUser = await this.usersService.findById(user._id.toString());
    if (currentUser.avatar) {
      await this.mediaService.deleteImage(currentUser.avatar).catch(() => null);
    }

    return this.usersService.updateProfile(user._id.toString(), { avatar: newUrl });
  }
}
