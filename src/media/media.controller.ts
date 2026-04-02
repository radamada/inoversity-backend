import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-video')
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: '/tmp',
      filename: (_, file, cb) => cb(null, `${Date.now()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
  }))
  @ApiOperation({ summary: 'Upload video la Bunny.net prin proxy server (API key securizat)' })
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
  ) {
    if (!file) throw new BadRequestException('Niciun fișier primit');
    return this.mediaService.uploadVideo(file, title);
  }

  @Post('upload-image')
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload thumbnail imagine la Bunny.net Storage' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Niciun fișier primit');
    const url = await this.mediaService.uploadImage(file.buffer, file.originalname, file.mimetype);
    return { url };
  }

  @Delete('image')
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Șterge thumbnail din Bunny.net Storage' })
  async deleteImage(@Query('url') url: string) {
    if (!url) throw new BadRequestException('Parametrul url lipsește');
    await this.mediaService.deleteImage(url);
    return { success: true };
  }

  @Get('play-url/:videoId')
  @ApiOperation({ summary: 'URL semnat pentru redare video (acces protejat)' })
  getPlayUrl(
    @Param('videoId') videoId: string,
    @Query('courseId') courseId: string,
    @CurrentUser() user: any,
  ) {
    return this.mediaService
      .getSignedPlayUrl(videoId, user._id.toString(), courseId)
      .then((url) => ({ url }));
  }
}

@ApiTags('Media')
@Controller('media')
export class PublicMediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('preview-url/:videoId')
  @ApiOperation({ summary: 'URL semnat pentru preview lecție gratuită (fără autentificare)' })
  async getPreviewUrl(@Param('videoId') videoId: string) {
    const url = await this.mediaService.getPreviewUrlForFreeLesson(videoId);
    return { url };
  }
}
