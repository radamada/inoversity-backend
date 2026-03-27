"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const enrollments_service_1 = require("../enrollments/enrollments.service");
const lesson_schema_1 = require("../courses/schemas/lesson.schema");
let MediaService = class MediaService {
    config;
    enrollmentsService;
    lessonModel;
    apiKey;
    libraryId;
    cdnHostname;
    tokenKey;
    baseUrl = 'https://video.bunnycdn.com';
    storageApiKey;
    storageZoneName;
    storageCdnUrl;
    constructor(config, enrollmentsService, lessonModel) {
        this.config = config;
        this.enrollmentsService = enrollmentsService;
        this.lessonModel = lessonModel;
        this.apiKey = config.get('BUNNY_STREAM_API_KEY') ?? '';
        this.libraryId = config.get('BUNNY_STREAM_LIBRARY_ID') ?? '';
        this.cdnHostname = config.get('BUNNY_CDN_HOSTNAME') ?? '';
        this.tokenKey = config.get('BUNNY_TOKEN_AUTHENTICATION_KEY') ?? '';
        this.storageApiKey = config.get('BUNNY_STORAGE_API_KEY') ?? '';
        this.storageZoneName = config.get('BUNNY_STORAGE_ZONE_NAME') ?? '';
        this.storageCdnUrl = config.get('BUNNY_STORAGE_CDN_URL') ?? '';
    }
    async uploadVideo(file, title) {
        const createRes = await axios_1.default.post(`${this.baseUrl}/library/${this.libraryId}/videos`, { title: title || file.originalname }, { headers: { AccessKey: this.apiKey, 'Content-Type': 'application/json' } });
        const videoId = createRes.data.guid;
        const uploadUrl = `${this.baseUrl}/library/${this.libraryId}/videos/${videoId}`;
        const fileStream = (0, fs_1.createReadStream)(file.path);
        await axios_1.default.put(uploadUrl, fileStream, {
            headers: { AccessKey: this.apiKey, 'Content-Type': 'application/octet-stream' },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        });
        await (0, promises_1.unlink)(file.path).catch(() => null);
        return { videoId };
    }
    async getUploadUrl(title) {
        const response = await axios_1.default.post(`${this.baseUrl}/library/${this.libraryId}/videos`, { title }, {
            headers: {
                AccessKey: this.apiKey,
                'Content-Type': 'application/json',
            },
        });
        return {
            videoId: response.data.guid,
            uploadUrl: `${this.baseUrl}/library/${this.libraryId}/videos/${response.data.guid}`,
        };
    }
    async getSignedPlayUrl(videoId, userId, courseId) {
        const isEnrolled = await this.enrollmentsService.isEnrolled(userId, courseId);
        if (!isEnrolled) {
            throw new common_1.UnauthorizedException('Nu ești înscris la acest curs');
        }
        return this.buildSignedUrl(videoId);
    }
    async getPreviewUrlForFreeLesson(videoId) {
        const lesson = await this.lessonModel.findOne({ cdnVideoId: videoId });
        if (!lesson || !lesson.isFree) {
            throw new common_1.ForbiddenException('Această lecție nu este disponibilă pentru preview gratuit');
        }
        return this.buildSignedUrl(videoId);
    }
    buildSignedUrl(videoId) {
        const expiry = Math.floor(Date.now() / 1000) + 4 * 60 * 60;
        const path = `/${videoId}/playlist.m3u8`;
        const hashInput = `${this.tokenKey}${path}${expiry}`;
        const token = crypto
            .createHash('sha256')
            .update(hashInput)
            .digest('hex')
            .toLowerCase();
        return `https://${this.cdnHostname}${path}?token=${token}&expires=${expiry}`;
    }
    async uploadImage(buffer, filename, mimetype) {
        const uniqueName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
        const uploadUrl = `https://storage.bunnycdn.com/${this.storageZoneName}/thumbnails/${uniqueName}`;
        await axios_1.default.put(uploadUrl, buffer, {
            headers: {
                AccessKey: this.storageApiKey,
                'Content-Type': mimetype,
            },
            maxBodyLength: Infinity,
        });
        return `${this.storageCdnUrl}/thumbnails/${uniqueName}`;
    }
    async deleteImage(cdnUrl) {
        const prefix = this.storageCdnUrl.replace(/\/$/, '');
        if (!cdnUrl.startsWith(prefix)) {
            throw new common_1.BadRequestException('URL-ul nu aparține storage-ului configurat');
        }
        const filePath = cdnUrl.slice(prefix.length);
        const deleteUrl = `https://storage.bunnycdn.com/${this.storageZoneName}${filePath}`;
        await axios_1.default.delete(deleteUrl, {
            headers: { AccessKey: this.storageApiKey },
        });
    }
    async deleteVideo(videoId) {
        await axios_1.default.delete(`${this.baseUrl}/library/${this.libraryId}/videos/${videoId}`, { headers: { AccessKey: this.apiKey } });
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, mongoose_1.InjectModel)(lesson_schema_1.Lesson.name)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        enrollments_service_1.EnrollmentsService,
        mongoose_2.Model])
], MediaService);
//# sourceMappingURL=media.service.js.map