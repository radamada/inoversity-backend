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
  HttpCode,
  Ip,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { openSync, readSync, closeSync } from 'fs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';
import { detectFileType } from '../common/utils/file-magic';

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
    // Validare prin magic bytes (file.mimetype e controlat de client). Fișierul
    // e pe disc (diskStorage) — citim doar primii 16 bytes ca să detectăm
    // signature-ul, fără să încărcăm tot în memorie.
    const head = Buffer.alloc(16);
    const fd = openSync(file.path, 'r');
    try { readSync(fd, head, 0, 16, 0); } finally { closeSync(fd); }
    const detected = detectFileType(head);
    // 'video/webm' din util acoperă și matroska (același container EBML), deci
    // include și 'video/x-matroska' pentru fișiere .mkv.
    const allowedVideoMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!detected || !allowedVideoMimes.includes(detected)) {
      throw new BadRequestException('Tip de fișier invalid. Sunt acceptate: MP4, MOV, AVI, WebM, MKV');
    }
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
    const detected = detectFileType(file.buffer);
    const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!detected || !allowedImageMimes.includes(detected)) {
      throw new BadRequestException('Tip de fișier invalid. Sunt acceptate: JPEG, PNG, WebP');
    }
    // Folosim mime-type-ul detectat din conținut, nu pe cel trimis de client.
    const url = await this.mediaService.uploadImage(file.buffer, file.originalname, detected);
    return { url };
  }

  @Delete('image')
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Șterge thumbnail din Bunny.net Storage' })
  async deleteImage(
    @Query('url') url: string,
    @CurrentUser() user: any,
  ) {
    if (!url) throw new BadRequestException('Parametrul url lipsește');
    // Admins can delete any image; instructors only their own course thumbnails
    if (user.role !== 'admin') {
      const ownsImage = await this.mediaService.isImageOwnedByUser(url, user._id.toString());
      if (!ownsImage) {
        throw new BadRequestException('Nu ai permisiunea să ștergi această imagine');
      }
    }
    await this.mediaService.deleteImage(url);
    return { success: true };
  }

  @Post('videos/cleanup')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Șterge mai multe video-uri orfane de pe CDN (doar admin)' })
  async cleanupVideos(@Body() body: { videoIds: string[] }) {
    const ids: string[] = Array.isArray(body?.videoIds) ? body.videoIds.slice(0, 50) : [];
    await Promise.all(ids.map((id) => this.mediaService.deleteVideo(id).catch(() => null)));
  }

  @Delete('video/:videoId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Șterge un video de pe CDN (pentru lecții nesalvate)' })
  async deleteVideo(
    @Param('videoId') videoId: string,
    @CurrentUser() user: any,
  ) {
    if (user.role !== 'admin') {
      const owns = await this.mediaService.isVideoOwnedByUser(videoId, user._id.toString());
      if (!owns) {
        throw new BadRequestException('Nu ai permisiunea să ștergi acest videoclip');
      }
    }
    await this.mediaService.deleteVideo(videoId);
    return { success: true };
  }

  @Get('video-status/:videoId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Status procesare video pe CDN (0-6; 4=Finished)' })
  getVideoStatus(@Param('videoId') videoId: string) {
    return this.mediaService.getVideoStatus(videoId);
  }

  @Get('play-url/:videoId')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'URL semnat pentru redare video (acces protejat, legat de IP)' })
  getPlayUrl(
    @Param('videoId') videoId: string,
    @Query('courseId', ParseObjectIdPipe) courseId: string,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.mediaService
      .getSignedPlayUrl(videoId, user._id.toString(), courseId, ip)
      .then((url) => ({ url }));
  }
}

@ApiTags('Media')
@Controller('media')
export class PublicMediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('preview-url/:videoId')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'URL semnat pentru preview lecție gratuită (legat de IP)' })
  async getPreviewUrl(@Param('videoId') videoId: string, @Ip() ip: string) {
    const url = await this.mediaService.getPreviewUrlForFreeLesson(videoId, ip);
    return { url };
  }
}
