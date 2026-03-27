"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicMediaController = exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const media_service_1 = require("./media.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
class UploadUrlDto {
    title;
}
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Lecția 1 – Introducere' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadUrlDto.prototype, "title", void 0);
let MediaController = class MediaController {
    mediaService;
    constructor(mediaService) {
        this.mediaService = mediaService;
    }
    async uploadVideo(file, title) {
        if (!file)
            throw new common_1.BadRequestException('Niciun fișier primit');
        return this.mediaService.uploadVideo(file, title);
    }
    getUploadUrl(dto) {
        return this.mediaService.getUploadUrl(dto.title);
    }
    async uploadImage(file) {
        if (!file)
            throw new common_1.BadRequestException('Niciun fișier primit');
        const url = await this.mediaService.uploadImage(file.buffer, file.originalname, file.mimetype);
        return { url };
    }
    async deleteImage(url) {
        if (!url)
            throw new common_1.BadRequestException('Parametrul url lipsește');
        await this.mediaService.deleteImage(url);
        return { success: true };
    }
    getPlayUrl(videoId, courseId, user) {
        return this.mediaService
            .getSignedPlayUrl(videoId, user._id.toString(), courseId)
            .then((url) => ({ url }));
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Post)('upload-video'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'instructor'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: '/tmp',
            filename: (_, file, cb) => cb(null, `${Date.now()}${(0, path_1.extname)(file.originalname)}`),
        }),
        limits: { fileSize: 2 * 1024 * 1024 * 1024 },
    })),
    (0, swagger_1.ApiOperation)({ summary: 'Upload video la Bunny.net prin proxy server (API key securizat)' }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('title')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "uploadVideo", null);
__decorate([
    (0, common_1.Post)('upload-url'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'instructor'),
    (0, swagger_1.ApiOperation)({ summary: 'Obține URL upload direct Bunny.net' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UploadUrlDto]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getUploadUrl", null);
__decorate([
    (0, common_1.Post)('upload-image'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'instructor'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 5 * 1024 * 1024 } })),
    (0, swagger_1.ApiOperation)({ summary: 'Upload thumbnail imagine la Bunny.net Storage' }),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Delete)('image'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'instructor'),
    (0, swagger_1.ApiOperation)({ summary: 'Șterge thumbnail din Bunny.net Storage' }),
    __param(0, (0, common_1.Query)('url')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "deleteImage", null);
__decorate([
    (0, common_1.Get)('play-url/:videoId'),
    (0, swagger_1.ApiOperation)({ summary: 'URL semnat pentru redare video (acces protejat)' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Query)('courseId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getPlayUrl", null);
exports.MediaController = MediaController = __decorate([
    (0, swagger_1.ApiTags)('Media'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('media'),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaController);
let PublicMediaController = class PublicMediaController {
    mediaService;
    constructor(mediaService) {
        this.mediaService = mediaService;
    }
    async getPreviewUrl(videoId) {
        const url = await this.mediaService.getPreviewUrlForFreeLesson(videoId);
        return { url };
    }
};
exports.PublicMediaController = PublicMediaController;
__decorate([
    (0, common_1.Get)('preview-url/:videoId'),
    (0, swagger_1.ApiOperation)({ summary: 'URL semnat pentru preview lecție gratuită (fără autentificare)' }),
    __param(0, (0, common_1.Param)('videoId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicMediaController.prototype, "getPreviewUrl", null);
exports.PublicMediaController = PublicMediaController = __decorate([
    (0, swagger_1.ApiTags)('Media'),
    (0, common_1.Controller)('media'),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], PublicMediaController);
//# sourceMappingURL=media.controller.js.map