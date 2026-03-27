"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const enrollments_service_1 = require("./enrollments.service");
const enrollments_controller_1 = require("./enrollments.controller");
const enrollment_schema_1 = require("./schemas/enrollment.schema");
const lesson_schema_1 = require("../courses/schemas/lesson.schema");
const course_schema_1 = require("../courses/schemas/course.schema");
let EnrollmentsModule = class EnrollmentsModule {
};
exports.EnrollmentsModule = EnrollmentsModule;
exports.EnrollmentsModule = EnrollmentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: enrollment_schema_1.Enrollment.name, schema: enrollment_schema_1.EnrollmentSchema },
                { name: lesson_schema_1.Lesson.name, schema: lesson_schema_1.LessonSchema },
                { name: course_schema_1.Course.name, schema: course_schema_1.CourseSchema },
            ]),
        ],
        providers: [enrollments_service_1.EnrollmentsService],
        controllers: [enrollments_controller_1.EnrollmentsController],
        exports: [enrollments_service_1.EnrollmentsService],
    })
], EnrollmentsModule);
//# sourceMappingURL=enrollments.module.js.map