import { MediaService } from './media.service';
declare class UploadUrlDto {
    title: string;
}
export declare class MediaController {
    private readonly mediaService;
    constructor(mediaService: MediaService);
    uploadVideo(file: Express.Multer.File, title: string): Promise<{
        videoId: string;
    }>;
    getUploadUrl(dto: UploadUrlDto): Promise<{
        videoId: string;
        uploadUrl: string;
    }>;
    uploadImage(file: Express.Multer.File): Promise<{
        url: string;
    }>;
    deleteImage(url: string): Promise<{
        success: boolean;
    }>;
    getPlayUrl(videoId: string, courseId: string, user: any): Promise<{
        url: string;
    }>;
}
export declare class PublicMediaController {
    private readonly mediaService;
    constructor(mediaService: MediaService);
    getPreviewUrl(videoId: string): Promise<{
        url: string;
    }>;
}
export {};
