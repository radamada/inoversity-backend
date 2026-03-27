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
exports.EnrollmentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const enrollments_service_1 = require("./enrollments.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let EnrollmentsController = class EnrollmentsController {
    enrollmentsService;
    constructor(enrollmentsService) {
        this.enrollmentsService = enrollmentsService;
    }
    getMyEnrollments(user) {
        return this.enrollmentsService.getMyEnrollments(user._id.toString());
    }
    getProgress(user, courseId) {
        return this.enrollmentsService.getProgress(user._id.toString(), courseId);
    }
    markLesson(user, courseId, lessonId) {
        return this.enrollmentsService.markLessonComplete(user._id.toString(), courseId, lessonId);
    }
};
exports.EnrollmentsController = EnrollmentsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "getMyEnrollments", null);
__decorate([
    (0, common_1.Get)(':courseId/progress'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('courseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "getProgress", null);
__decorate([
    (0, common_1.Patch)(':courseId/lessons/:lessonId/progress'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('courseId')),
    __param(2, (0, common_1.Param)('lessonId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "markLesson", null);
exports.EnrollmentsController = EnrollmentsController = __decorate([
    (0, swagger_1.ApiTags)('Enrollments'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('enrollments'),
    __metadata("design:paramtypes", [enrollments_service_1.EnrollmentsService])
], EnrollmentsController);
//# sourceMappingURL=enrollments.controller.js.map