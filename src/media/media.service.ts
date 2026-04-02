import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const heicConvert = require('heic-convert');
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Lesson, LessonDocument } from '../courses/schemas/lesson.schema';

@Injectable()
export class MediaService {
  private readonly apiKey: string;
  private readonly libraryId: string;
  private readonly cdnHostname: string;
  private readonly tokenKey: string;
  private readonly baseUrl = 'https://video.bunnycdn.com';

  private readonly storageApiKey: string;
  private readonly storageZoneName: string;
  private readonly storageCdnUrl: string;

  constructor(
    private config: ConfigService,
    private enrollmentsService: EnrollmentsService,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
  ) {
    this.apiKey = config.get<string>('BUNNY_STREAM_API_KEY') ?? '';
    this.libraryId = config.get<string>('BUNNY_STREAM_LIBRARY_ID') ?? '';
    this.cdnHostname = config.get<string>('BUNNY_CDN_HOSTNAME') ?? '';
    this.tokenKey = config.get<string>('BUNNY_TOKEN_AUTHENTICATION_KEY') ?? '';
    this.storageApiKey = config.get<string>('BUNNY_STORAGE_API_KEY') ?? '';
    this.storageZoneName = config.get<string>('BUNNY_STORAGE_ZONE_NAME') ?? '';
    this.storageCdnUrl = config.get<string>('BUNNY_STORAGE_CDN_URL') ?? '';
  }

  /**
   * Upload video through backend proxy — API key never leaves the server.
   * Accepts a file from disk (multer diskStorage), streams it to Bunny.net.
   */
  async uploadVideo(file: Express.Multer.File, title: string): Promise<{ videoId: string }> {
    // 1. Create video entry in Bunny.net
    const createRes = await axios.post(
      `${this.baseUrl}/library/${this.libraryId}/videos`,
      { title: title || file.originalname },
      { headers: { AccessKey: this.apiKey, 'Content-Type': 'application/json' } },
    );
    const videoId: string = createRes.data.guid;
    const uploadUrl = `${this.baseUrl}/library/${this.libraryId}/videos/${videoId}`;

    // 2. Stream file from disk to Bunny.net (low memory footprint)
    const fileStream = createReadStream(file.path);
    await axios.put(uploadUrl, fileStream, {
      headers: { AccessKey: this.apiKey, 'Content-Type': 'application/octet-stream' },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    // 3. Remove temp file from disk
    await unlink(file.path).catch(() => null);

    return { videoId };
  }

  /**
   * @deprecated Use uploadVideo() instead — this exposes the upload URL client-side.
   * Kept for reference only.
   */
  async getUploadUrl(title: string): Promise<{ videoId: string; uploadUrl: string }> {
    const response = await axios.post(
      `${this.baseUrl}/library/${this.libraryId}/videos`,
      { title },
      {
        headers: {
          AccessKey: this.apiKey,
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      videoId: response.data.guid,
      uploadUrl: `${this.baseUrl}/library/${this.libraryId}/videos/${response.data.guid}`,
    };
  }

  /**
   * Generate a signed CDN playback URL for a video
   * Only accessible to enrolled users
   */
  async getSignedPlayUrl(
    videoId: string,
    userId: string,
    courseId: string,
  ): Promise<string> {
    const isEnrolled = await this.enrollmentsService.isEnrolled(userId, courseId);
    if (!isEnrolled) {
      throw new UnauthorizedException('Nu ești înscris la acest curs');
    }

    return this.buildSignedUrl(videoId);
  }

  /**
   * Get signed URL for free preview lessons (no enrollment check).
   * Verifies the lesson is actually marked isFree before returning.
   */
  async getPreviewUrlForFreeLesson(videoId: string): Promise<string> {
    const lesson = await this.lessonModel.findOne({ cdnVideoId: videoId });
    if (!lesson || !lesson.isFree) {
      throw new ForbiddenException('Această lecție nu este disponibilă pentru preview gratuit');
    }
    return this.buildSignedUrl(videoId);
  }

  private buildSignedUrl(videoId: string): string {
    const expiry = Math.floor(Date.now() / 1000) + 4 * 60 * 60; // 4 hours
    const path = `/${videoId}/playlist.m3u8`;
    const hashInput = `${this.tokenKey}${path}${expiry}`;
    const token = crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex')
      .toLowerCase();

    return `https://${this.cdnHostname}${path}?token=${token}&expires=${expiry}`;
  }

  /**
   * Upload an image to Bunny.net Storage and return the public CDN URL
   */
  private async normalizeImage(buffer: Buffer, mimetype: string): Promise<{ buffer: Buffer; mimetype: string; ext: string }> {
    if (mimetype === 'image/heic' || mimetype === 'image/heic-sequence' || mimetype === 'image/heif') {
      const jpegBuffer: ArrayBuffer = await heicConvert({ buffer, format: 'JPEG', quality: 0.92 });
      return { buffer: Buffer.from(jpegBuffer), mimetype: 'image/jpeg', ext: '.jpg' };
    }
    return { buffer, mimetype, ext: '' };
  }

  async uploadImage(buffer: Buffer, filename: string, mimetype: string, folder = 'thumbnails'): Promise<string> {
    const normalized = await this.normalizeImage(buffer, mimetype);

    // Dacă a fost convertit din HEIC, înlocuiește extensia cu .jpg
    const normalizedFilename = normalized.ext
      ? filename.replace(/\.[^.]+$/, normalized.ext)
      : filename;

    const uniqueName = `${Date.now()}-${normalizedFilename.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const uploadUrl = `https://storage.bunnycdn.com/${this.storageZoneName}/${folder}/${uniqueName}`;

    await axios.put(uploadUrl, normalized.buffer, {
      headers: {
        AccessKey: this.storageApiKey,
        'Content-Type': normalized.mimetype,
      },
      maxBodyLength: Infinity,
    });

    return `${this.storageCdnUrl}/${folder}/${uniqueName}`;
  }

  /**
   * Delete an image from Bunny.net Storage by its CDN URL
   */
  async deleteImage(cdnUrl: string): Promise<void> {
    // Extract the path after the CDN hostname, e.g. "/thumbnails/123-file.png"
    const prefix = this.storageCdnUrl.replace(/\/$/, '');
    if (!cdnUrl.startsWith(prefix)) {
      throw new BadRequestException('URL-ul nu aparține storage-ului configurat');
    }
    const filePath = cdnUrl.slice(prefix.length); // e.g. "/thumbnails/123-file.png"
    const deleteUrl = `https://storage.bunnycdn.com/${this.storageZoneName}${filePath}`;
    await axios.delete(deleteUrl, {
      headers: { AccessKey: this.storageApiKey },
    });
  }

  /**
   * Delete a video from Bunny.net
   */
  async deleteVideo(videoId: string): Promise<void> {
    await axios.delete(
      `${this.baseUrl}/library/${this.libraryId}/videos/${videoId}`,
      { headers: { AccessKey: this.apiKey } },
    );
  }
}
