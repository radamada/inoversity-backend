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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const admin_service_1 = require("./admin.service");
const courses_service_1 = require("../courses/courses.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_course_dto_1 = require("../courses/dto/create-course.dto");
class SetRoleDto {
    role;
}
__decorate([
    (0, swagger_2.ApiProperty)({ enum: ['student', 'instructor', 'admin'] }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SetRoleDto.prototype, "role", void 0);
class SetActiveDto {
    isActive;
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SetActiveDto.prototype, "isActive", void 0);
class CreateSectionDto {
    title;
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CreateSectionDto.prototype, "title", void 0);
class UpdateSectionDto {
    title;
    order;
}
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSectionDto.prototype, "title", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateSectionDto.prototype, "order", void 0);
class CreateLessonDto {
    title;
    description;
    cdnVideoId;
    duration;
    isFree;
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "title", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "description", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "cdnVideoId", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateLessonDto.prototype, "duration", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateLessonDto.prototype, "isFree", void 0);
class PaginationDto {
    page = 1;
    limit = 20;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PaginationDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PaginationDto.prototype, "limit", void 0);
let AdminController = class AdminController {
    adminService;
    coursesService;
    constructor(adminService, coursesService) {
        this.adminService = adminService;
        this.coursesService = coursesService;
    }
    getStats() {
        return this.adminService.getStats();
    }
    getUsers(q) {
        return this.adminService.getUsers(q.page ?? 1, q.limit ?? 20);
    }
    setRole(id, dto) {
        return this.adminService.setUserRole(id, dto.role);
    }
    setActive(id, dto) {
        return this.adminService.setUserActive(id, dto.isActive);
    }
    getOrders(q) {
        return this.adminService.getOrders(q.page ?? 1, q.limit ?? 20);
    }
    refundOrder(id) {
        return this.adminService.refundOrder(id);
    }
    getAllCourses(q) {
        return this.adminService.getAllCourses(q.page ?? 1, q.limit ?? 20);
    }
    getCourse(id) {
        return this.coursesService.findById(id);
    }
    createCourse(dto, user) {
        return this.coursesService.create(dto, user._id.toString());
    }
    updateCourse(id, dto, user) {
        return this.coursesService.update(id, dto, user._id.toString(), true);
    }
    togglePublish(id) {
        return this.coursesService.togglePublish(id);
    }
    deleteCourse(id) {
        return this.coursesService.delete(id);
    }
    createSection(courseId, dto) {
        return this.coursesService.createSection(courseId, dto.title);
    }
    updateSection(id, dto) {
        return this.coursesService.updateSection(id, dto);
    }
    deleteSection(id) {
        return this.coursesService.deleteSection(id);
    }
    createLesson(sectionId, courseId, dto) {
        return this.coursesService.createLesson(sectionId, courseId, dto);
    }
    updateLesson(id, dto) {
        return this.coursesService.updateLesson(id, dto);
    }
    deleteLesson(id) {
        return this.coursesService.deleteLesson(id);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Statistici generale platformă' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PaginationDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Patch)('users/:id/role'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SetRoleDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "setRole", null);
__decorate([
    (0, common_1.Patch)('users/:id/active'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SetActiveDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "setActive", null);
__decorate([
    (0, common_1.Get)('orders'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PaginationDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getOrders", null);
__decorate([
    (0, common_1.Patch)('orders/:id/refund'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "refundOrder", null);
__decorate([
    (0, common_1.Get)('courses'),
    (0, swagger_1.ApiOperation)({ summary: 'Toate cursurile (draft + published)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PaginationDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAllCourses", null);
__decorate([
    (0, common_1.Get)('courses/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Un curs după ID (admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getCourse", null);
__decorate([
    (0, common_1.Post)('courses'),
    (0, swagger_1.ApiOperation)({ summary: 'Creare curs nou' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_course_dto_1.CreateCourseDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createCourse", null);
__decorate([
    (0, common_1.Patch)('courses/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateCourse", null);
__decorate([
    (0, common_1.Patch)('courses/:id/publish'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "togglePublish", null);
__decorate([
    (0, common_1.Delete)('courses/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteCourse", null);
__decorate([
    (0, common_1.Post)('courses/:courseId/sections'),
    __param(0, (0, common_1.Param)('courseId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateSectionDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createSection", null);
__decorate([
    (0, common_1.Patch)('sections/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateSectionDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateSection", null);
__decorate([
    (0, common_1.Delete)('sections/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteSection", null);
__decorate([
    (0, common_1.Post)('sections/:sectionId/lessons'),
    __param(0, (0, common_1.Param)('sectionId')),
    __param(1, (0, common_1.Query)('courseId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, CreateLessonDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createLesson", null);
__decorate([
    (0, common_1.Patch)('lessons/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateLesson", null);
__decorate([
    (0, common_1.Delete)('lessons/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteLesson", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        courses_service_1.CoursesService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map