"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstructorModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const instructor_controller_1 = require("./instructor.controller");
const instructor_service_1 = require("./instructor.service");
const course_schema_1 = require("../courses/schemas/course.schema");
const section_schema_1 = require("../courses/schemas/section.schema");
const lesson_schema_1 = require("../courses/schemas/lesson.schema");
const enrollment_schema_1 = require("../enrollments/schemas/enrollment.schema");
const order_schema_1 = require("../orders/schemas/order.schema");
const courses_module_1 = require("../courses/courses.module");
let InstructorModule = class InstructorModule {
};
exports.InstructorModule = InstructorModule;
exports.InstructorModule = InstructorModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: course_schema_1.Course.name, schema: course_schema_1.CourseSchema },
                { name: section_schema_1.Section.name, schema: section_schema_1.SectionSchema },
                { name: lesson_schema_1.Lesson.name, schema: lesson_schema_1.LessonSchema },
                { name: enrollment_schema_1.Enrollment.name, schema: enrollment_schema_1.EnrollmentSchema },
                { name: order_schema_1.Order.name, schema: order_schema_1.OrderSchema },
            ]),
            courses_module_1.CoursesModule,
        ],
        controllers: [instructor_controller_1.InstructorController],
        providers: [instructor_service_1.InstructorService],
    })
], InstructorModule);
//# sourceMappingURL=instructor.module.js.map