import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const heicConvert = require('heic-convert');
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Lesson, LessonDocument } from '../courses/schemas/lesson.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';

/** Validate file content by checking magic bytes (file signatures) */
function validateImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // WebP: RIFF....WEBP
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return true;
  // HEIC/HEIF: ....ftyp (at offset 4)
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') return true;
  return false;
}

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
  private readonly bindTokenToIp: boolean;

  constructor(
    private config: ConfigService,
    private enrollmentsService: EnrollmentsService,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
  ) {
    this.apiKey = config.get<string>('BUNNY_STREAM_API_KEY') ?? '';
    this.libraryId = config.get<string>('BUNNY_STREAM_LIBRARY_ID') ?? '';
    this.cdnHostname = config.get<string>('BUNNY_CDN_HOSTNAME') ?? '';
    this.tokenKey = config.get<string>('BUNNY_TOKEN_AUTHENTICATION_KEY') ?? '';
    this.storageApiKey = config.get<string>('BUNNY_STORAGE_API_KEY') ?? '';
    this.storageZoneName = config.get<string>('BUNNY_STORAGE_ZONE_NAME') ?? '';
    this.storageCdnUrl = config.get<string>('BUNNY_STORAGE_CDN_URL') ?? '';
    // Only include IP in token hash if Bunny's "Token Auth IP Restriction"
    // is enabled in the dashboard — otherwise the CDN computes a hash
    // WITHOUT IP and ours won't match, breaking all playback.
    this.bindTokenToIp = (config.get<string>('BUNNY_BIND_TOKEN_TO_IP') ?? '').toLowerCase() === 'true';
  }

  /**
   * Upload video through backend proxy — API key never leaves the server.
   * Accepts a file from disk (multer diskStorage), streams it to Bunny.net.
   */
  async uploadVideo(file: Express.Multer.File, title: string): Promise<{ videoId: string }> {

    let videoId: string | null = null;
    try {
      // 1. Create video entry in Bunny.net
      const createRes = await axios.post(
        `${this.baseUrl}/library/${this.libraryId}/videos`,
        { title: title || file.originalname },
        { headers: { AccessKey: this.apiKey, 'Content-Type': 'application/json' } },
      );
      videoId = createRes.data.guid as string;
      const uploadUrl = `${this.baseUrl}/library/${this.libraryId}/videos/${videoId}`;

      // 2. Stream file from disk to Bunny.net (low memory footprint)
      const fileStream = createReadStream(file.path);
      await axios.put(uploadUrl, fileStream, {
        headers: { AccessKey: this.apiKey, 'Content-Type': 'application/octet-stream' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
    } catch {
      throw new InternalServerErrorException('Eroare la încărcarea videoclipului pe CDN');
    } finally {
      // 3. Always remove temp file from disk
      await unlink(file.path).catch(() => null);
    }

    return { videoId: videoId! };
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
   * Generate a signed CDN playback URL for a video.
   * Validates:
   * 1. User is enrolled in the given courseId
   * 2. The videoId actually belongs to that course (prevents cross-course access)
   */
  async getSignedPlayUrl(
    videoId: string,
    userId: string,
    courseId: string,
    clientIp?: string,
  ): Promise<string> {
    const isEnrolled = await this.enrollmentsService.isEnrolled(userId, courseId);
    if (!isEnrolled) {
      throw new UnauthorizedException('Nu ești înscris la acest curs');
    }

    // Verify the videoId belongs to the requested course — prevents enrolled user
    // in course A from requesting signed URLs for videos in course B
    const lesson = await this.lessonModel.findOne({
      cdnVideoId: videoId,
      courseId: new Types.ObjectId(courseId),
    }).lean();
    if (!lesson) {
      throw new ForbiddenException('Videoclipul nu aparține acestui curs');
    }

    return this.buildSignedUrl(videoId, clientIp);
  }

  /**
   * Get signed URL for free preview lessons (no enrollment check).
   * Verifies the lesson is actually marked isFree before returning.
   */
  async getPreviewUrlForFreeLesson(videoId: string, clientIp?: string): Promise<string> {
    const lesson = await this.lessonModel.findOne({ cdnVideoId: videoId });
    if (!lesson || !lesson.isFree) {
      throw new ForbiddenException('Această lecție nu este disponibilă pentru preview gratuit');
    }
    return this.buildSignedUrl(videoId, clientIp);
  }

  /**
   * Build a Bunny.net signed playback URL.
   * Binds the token to the requesting client IP (when available) so that a
   * leaked URL cannot be replayed from a different network. Bunny's CDN
   * extracts the actual client IP and recomputes the hash — if it doesn't
   * match, the request is rejected. TTL is short (15 min) to further limit
   * exposure; the player refreshes via /play-url when it expires.
   */
  private buildSignedUrl(videoId: string, clientIp?: string): string {
    const expiry = Math.floor(Date.now() / 1000) + 15 * 60; // 15 min
    const path = `/${videoId}/playlist.m3u8`;
    const normalizedIp = this.bindTokenToIp ? this.normalizeIp(clientIp) : '';
    const hashInput = normalizedIp
      ? `${this.tokenKey}${path}${expiry}${normalizedIp}`
      : `${this.tokenKey}${path}${expiry}`;
    const token = crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex')
      .toLowerCase();

    return `https://${this.cdnHostname}${path}?token=${token}&expires=${expiry}`;
  }

  /**
   * Strip IPv4-mapped IPv6 prefix (e.g. "::ffff:1.2.3.4" → "1.2.3.4") and
   * trim whitespace. Bunny expects the IP exactly as the CDN observes it.
   */
  private normalizeIp(ip?: string): string {
    if (!ip) return '';
    const trimmed = ip.trim();
    if (trimmed.startsWith('::ffff:')) return trimmed.slice(7);
    return trimmed;
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
    if (!validateImageMagicBytes(buffer)) {
      throw new BadRequestException('Conținutul fișierului nu corespunde unui format de imagine valid');
    }
    const normalized = await this.normalizeImage(buffer, mimetype);

    // Dacă a fost convertit din HEIC, înlocuiește extensia cu .jpg
    const normalizedFilename = normalized.ext
      ? filename.replace(/\.[^.]+$/, normalized.ext)
      : filename;

    const uniqueName = `${Date.now()}-${normalizedFilename.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const uploadUrl = `https://storage.bunnycdn.com/${this.storageZoneName}/${folder}/${uniqueName}`;

    try {
      await axios.put(uploadUrl, normalized.buffer, {
        headers: {
          AccessKey: this.storageApiKey,
          'Content-Type': normalized.mimetype,
        },
        maxBodyLength: Infinity,
      });
    } catch {
      throw new InternalServerErrorException('Eroare la încărcarea fișierului pe CDN');
    }

    return `${this.storageCdnUrl}/${folder}/${uniqueName}`;
  }

  /**
   * Check if an image URL belongs to a course owned by the given user
   */
  async isImageOwnedByUser(cdnUrl: string, userId: string): Promise<boolean> {
    const course = await this.courseModel.findOne({
      thumbnail: cdnUrl,
      instructorId: new Types.ObjectId(userId),
    }).lean();
    return !!course;
  }

  /**
   * Delete an image from Bunny.net Storage by its CDN URL
   */
  async deleteImage(cdnUrl: string): Promise<void> {
    const prefix = this.storageCdnUrl.replace(/\/$/, '');
    if (!cdnUrl.startsWith(prefix)) {
      throw new BadRequestException('URL-ul nu aparține storage-ului configurat');
    }
    const filePath = cdnUrl.slice(prefix.length); // e.g. "/thumbnails/123-file.png"

    // Prevent directory traversal — decode percent-encoded sequences, normalize, and verify
    let normalizedPath: string;
    try {
      normalizedPath = decodeURIComponent(filePath);
    } catch {
      throw new BadRequestException('URL invalid');
    }
    normalizedPath = normalizedPath.replace(/\\/g, '/');
    // Reject any path containing '..' regardless of encoding
    if (normalizedPath.includes('..')) {
      throw new BadRequestException('URL invalid');
    }
    // Only allow alphanumeric, dash, underscore, dot, and forward slash
    if (!/^[\w.\-\/]+$/.test(normalizedPath)) {
      throw new BadRequestException('URL invalid');
    }

    const deleteUrl = `https://storage.bunnycdn.com/${this.storageZoneName}${normalizedPath}`;
    try {
      await axios.delete(deleteUrl, {
        headers: { AccessKey: this.storageApiKey },
      });
    } catch {
      throw new InternalServerErrorException('Eroare la ștergerea fișierului de pe CDN');
    }
  }

  /**
   * Get processing status of a video from Bunny.net.
   * Status codes: 0=Created, 1=Uploaded, 2=Processing, 3=Transcoding, 4=Finished, 5=Error, 6=UploadFailed
   */
  async getVideoStatus(videoId: string): Promise<{ status: number; encodeProgress: number }> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/library/${this.libraryId}/videos/${videoId}`,
        { headers: { AccessKey: this.apiKey } },
      );
      return { status: res.data.status ?? 0, encodeProgress: res.data.encodeProgress ?? 0 };
    } catch {
      throw new NotFoundException('Videoclipul nu a fost găsit pe CDN');
    }
  }

  /**
   * Check if a video (by CDN GUID) belongs to a course owned by the given instructor.
   */
  async isVideoOwnedByUser(videoId: string, userId: string): Promise<boolean> {
    const lesson = await this.lessonModel.findOne({ cdnVideoId: videoId }).lean();
    // Orphan video (not linked to any lesson) — deny deletion for instructors;
    // only admins can clean up orphaned assets via dedicated admin tools.
    if (!lesson) return false;
    const course = await this.courseModel.findOne({
      _id: lesson.courseId,
      instructorId: new Types.ObjectId(userId),
    }).lean();
    return !!course;
  }

  /**
   * Delete a video from Bunny.net
   */
  async deleteVideo(videoId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/library/${this.libraryId}/videos/${videoId}`,
        { headers: { AccessKey: this.apiKey } },
      );
    } catch {
      throw new InternalServerErrorException('Eroare la ștergerea videoclipului de pe CDN');
    }
  }
}
