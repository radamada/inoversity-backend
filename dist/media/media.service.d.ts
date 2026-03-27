import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { LessonDocument } from '../courses/schemas/lesson.schema';
export declare class MediaService {
    private config;
    private enrollmentsService;
    private lessonModel;
    private readonly apiKey;
    private readonly libraryId;
    private readonly cdnHostname;
    private readonly tokenKey;
    private readonly baseUrl;
    private readonly storageApiKey;
    private readonly storageZoneName;
    private readonly storageCdnUrl;
    constructor(config: ConfigService, enrollmentsService: EnrollmentsService, lessonModel: Model<LessonDocument>);
    uploadVideo(file: Express.Multer.File, title: string): Promise<{
        videoId: string;
    }>;
    getUploadUrl(title: string): Promise<{
        videoId: string;
        uploadUrl: string;
    }>;
    getSignedPlayUrl(videoId: string, userId: string, courseId: string): Promise<string>;
    getPreviewUrlForFreeLesson(videoId: string): Promise<string>;
    private buildSignedUrl;
    uploadImage(buffer: Buffer, filename: string, mimetype: string): Promise<string>;
    deleteImage(cdnUrl: string): Promise<void>;
    deleteVideo(videoId: string): Promise<void>;
}
