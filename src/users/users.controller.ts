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
  getInstructorProfile(@Param('id') id: string) {
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
    const allowed = ['image/', 'application/octet-stream']; // unele browsere trimit HEIC ca octet-stream
    const isHeic = file.originalname.toLowerCase().match(/\.(heic|heif)$/);
    if (!allowed.some((p) => file.mimetype.startsWith(p)) && !isHeic) {
      throw new BadRequestException('Fișierul trebuie să fie o imagine');
    }
    // Normalizăm mimetype-ul pentru HEIC detectat după extensie
    if (isHeic && !file.mimetype.startsWith('image/')) file.mimetype = 'image/heic';

    const newUrl = await this.mediaService.uploadImage(file.buffer, file.originalname, file.mimetype, 'avatars');

    // Șterge avatar-ul vechi de pe CDN (dacă era găzduit pe Bunny)
    const currentUser = await this.usersService.findById(user._id.toString());
    if (currentUser.avatar) {
      await this.mediaService.deleteImage(currentUser.avatar).catch(() => null);
    }

    return this.usersService.updateProfile(user._id.toString(), { avatar: newUrl });
  }
}
