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
exports.InstructorController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_2 = require("@nestjs/swagger");
const instructor_service_1 = require("./instructor.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const courses_service_1 = require("../courses/courses.service");
const create_course_dto_1 = require("../courses/dto/create-course.dto");
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
let InstructorController = class InstructorController {
    instructorService;
    coursesService;
    constructor(instructorService, coursesService) {
        this.instructorService = instructorService;
        this.coursesService = coursesService;
    }
    getStats(user) {
        return this.instructorService.getMyStats(user._id.toString());
    }
    getMyCourses(user) {
        return this.instructorService.getMyCourses(user._id.toString());
    }
    getCourse(id, user) {
        return this.instructorService.getCourseById(id, user._id.toString(), user.role === 'admin');
    }
    createCourse(dto, user) {
        return this.coursesService.create(dto, user._id.toString());
    }
    updateCourse(id, dto, user) {
        return this.coursesService.update(id, dto, user._id.toString(), user.role === 'admin');
    }
    togglePublish(id, user) {
        return this.instructorService.togglePublish(id, user._id.toString(), user.role === 'admin');
    }
    getMyOrders(q, user) {
        return this.instructorService.getMyOrders(user._id.toString(), q.page, q.limit);
    }
    createSection(courseId, dto, user) {
        return this.instructorService.createSection(courseId, dto.title, user._id.toString(), user.role === 'admin');
    }
    updateSection(id, dto, user) {
        return this.instructorService.updateSection(id, dto, user._id.toString(), user.role === 'admin');
    }
    deleteSection(id, user) {
        return this.instructorService.deleteSection(id, user._id.toString(), user.role === 'admin');
    }
    createLesson(sectionId, courseId, dto, user) {
        return this.instructorService.createLesson(sectionId, courseId, dto, user._id.toString(), user.role === 'admin');
    }
    updateLesson(id, dto, user) {
        return this.instructorService.updateLesson(id, dto, user._id.toString(), user.role === 'admin');
    }
    deleteLesson(id, user) {
        return this.instructorService.deleteLesson(id, user._id.toString(), user.role === 'admin');
    }
};
exports.InstructorController = InstructorController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Statisticile mele ca instructor' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstructorController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('courses'),
    (0, swagger_1.ApiOperation)({ summary: 'Cursurile mele' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstructorController.prototype, "getMyCourses", null);
__decorate([
    (0, common_1.Get)('courses/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Un curs al meu după ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InstructorController.prototype, "getCourse", null);
__decorate([
    (0, common_1.Post)('courses'),
    (0, swagger_1.ApiOperation)({ summary: 'Creare curs nou' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_course_dto_1.CreateCourseDto, Object]),
    __metadata("design:returntype", void 0)
], InstructorController.prototype, "createCourse", null);
__decorate([
    (0, common_1.Patch)('courses/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizare curs' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], InstructorController.prototype, "updateCourse", null);
__decorate([
    (0, common_1.Patch)('courses/:id/publish'),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle publicare curs' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InstructorController.prototype, "togglePublish", null);
__decorate([
    (0, common_1.Get)('orders'),
    (0, swagger_1.ApiOperation)({ summary: 'Comenzile pentru cursurile mele' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PaginationDto, Object]),
    __metadata("design:returntype", void 0)
], InstructorController.prototype, "getMyOrders", null);
__decorate([
    (0, common_1.Post)('courses/:courseId/sections'),
    __param(0, (0, common_1.Param)('courseId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateSectionDto, Object]),
    __metadata("design:returntype", void 0)
], InstructorController.prototype, "createSection", null);
__decorate([
    (0, common_1.Patch)('sections/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateSectionDto, Object]),
    __metadata("design:returntype", void 0)
], InstructorController.prototype, "updateSection", null);
__decorate([
    (0, common_1.Delete)('sections/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InstructorController.prototype, "deleteSection", null);
__decorate([
    (0, common_1.Post)('sections/:sectionId/lessons'),
    __param(0, (0, common_1.Param)('sectionId')),
    __param(1, (0, common_1.Query)('courseId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, CreateLessonDto, Object]),
    __metadata("design:returntype", void 0)
], InstructorController.prototype, "createLesson", null);
__decorate([
    (0, common_1.Patch)('lessons/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], InstructorController.prototype, "updateLesson", null);
__decorate([
    (0, common_1.Delete)('lessons/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InstructorController.prototype, "deleteLesson", null);
exports.InstructorController = InstructorController = __decorate([
    (0, swagger_1.ApiTags)('Instructor'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('instructor', 'admin'),
    (0, common_1.Controller)('instructor'),
    __metadata("design:paramtypes", [instructor_service_1.InstructorService,
        courses_service_1.CoursesService])
], InstructorController);
//# sourceMappingURL=instructor.controller.js.map