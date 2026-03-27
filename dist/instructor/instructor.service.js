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
exports.InstructorService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const course_schema_1 = require("../courses/schemas/course.schema");
const section_schema_1 = require("../courses/schemas/section.schema");
const lesson_schema_1 = require("../courses/schemas/lesson.schema");
const enrollment_schema_1 = require("../enrollments/schemas/enrollment.schema");
const order_schema_1 = require("../orders/schemas/order.schema");
const courses_service_1 = require("../courses/courses.service");
let InstructorService = class InstructorService {
    courseModel;
    sectionModel;
    lessonModel;
    enrollmentModel;
    orderModel;
    coursesService;
    constructor(courseModel, sectionModel, lessonModel, enrollmentModel, orderModel, coursesService) {
        this.courseModel = courseModel;
        this.sectionModel = sectionModel;
        this.lessonModel = lessonModel;
        this.enrollmentModel = enrollmentModel;
        this.orderModel = orderModel;
        this.coursesService = coursesService;
    }
    async getCourseById(courseId, instructorId, isAdmin = false) {
        await this.assertCourseOwner(courseId, instructorId, isAdmin);
        return this.coursesService.findById(courseId);
    }
    async getMyCourses(instructorId) {
        return this.courseModel
            .find({ instructorId: new mongoose_2.Types.ObjectId(instructorId) })
            .select('title slug thumbnail published price enrollmentCount createdAt')
            .sort({ createdAt: -1 })
            .lean()
            .exec();
    }
    async getMyStats(instructorId) {
        const myCourses = await this.courseModel
            .find({ instructorId: new mongoose_2.Types.ObjectId(instructorId) })
            .select('_id published')
            .lean();
        const courseIds = myCourses.map((c) => c._id);
        const totalCourses = myCourses.length;
        const publishedCourses = myCourses.filter((c) => c.published).length;
        const totalEnrollments = courseIds.length > 0
            ? await this.enrollmentModel.countDocuments({ courseId: { $in: courseIds } })
            : 0;
        let totalRevenue = 0;
        if (courseIds.length > 0) {
            const paidOrders = await this.orderModel
                .find({ status: 'paid', 'items.courseId': { $in: courseIds } })
                .select('items')
                .lean();
            const courseIdSet = new Set(courseIds.map((id) => id.toString()));
            for (const order of paidOrders) {
                for (const item of order.items) {
                    if (courseIdSet.has(item.courseId.toString())) {
                        totalRevenue += item.price;
                    }
                }
            }
        }
        return { totalCourses, publishedCourses, totalEnrollments, totalRevenue };
    }
    async getMyOrders(instructorId, page = 1, limit = 20) {
        const myCourses = await this.courseModel
            .find({ instructorId: new mongoose_2.Types.ObjectId(instructorId) })
            .select('_id')
            .lean();
        const courseIds = myCourses.map((c) => c._id);
        if (courseIds.length === 0)
            return { orders: [], total: 0, page, pages: 0 };
        const skip = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            this.orderModel
                .find({ status: 'paid', 'items.courseId': { $in: courseIds } })
                .populate('userId', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.orderModel.countDocuments({ status: 'paid', 'items.courseId': { $in: courseIds } }),
        ]);
        const courseIdSet = new Set(courseIds.map((id) => id.toString()));
        const ordersFiltered = orders.map((order) => ({
            ...order,
            items: order.items.filter((item) => courseIdSet.has(item.courseId.toString())),
            myRevenue: order.items
                .filter((item) => courseIdSet.has(item.courseId.toString()))
                .reduce((sum, item) => sum + item.price, 0),
        }));
        return { orders: ordersFiltered, total, page, pages: Math.ceil(total / limit) };
    }
    async assertCourseOwner(courseId, instructorId, isAdmin = false) {
        if (isAdmin)
            return;
        const course = await this.courseModel.findById(courseId).select('instructorId').lean();
        if (!course)
            throw new common_1.NotFoundException('Cursul nu a fost găsit');
        if (course.instructorId.toString() !== instructorId) {
            throw new common_1.ForbiddenException('Nu ai permisiunea de a modifica acest curs');
        }
    }
    async assertSectionOwner(sectionId, instructorId, isAdmin = false) {
        if (isAdmin)
            return;
        const section = await this.sectionModel.findById(sectionId).select('courseId').lean();
        if (!section)
            throw new common_1.NotFoundException('Secțiunea nu a fost găsită');
        await this.assertCourseOwner(section.courseId.toString(), instructorId);
    }
    async assertLessonOwner(lessonId, instructorId, isAdmin = false) {
        if (isAdmin)
            return;
        const lesson = await this.lessonModel.findById(lessonId).select('courseId').lean();
        if (!lesson)
            throw new common_1.NotFoundException('Lecția nu a fost găsită');
        await this.assertCourseOwner(lesson.courseId.toString(), instructorId);
    }
    async createSection(courseId, title, instructorId, isAdmin = false) {
        await this.assertCourseOwner(courseId, instructorId, isAdmin);
        return this.coursesService.createSection(courseId, title);
    }
    async updateSection(sectionId, dto, instructorId, isAdmin = false) {
        await this.assertSectionOwner(sectionId, instructorId, isAdmin);
        return this.coursesService.updateSection(sectionId, dto);
    }
    async deleteSection(sectionId, instructorId, isAdmin = false) {
        await this.assertSectionOwner(sectionId, instructorId, isAdmin);
        return this.coursesService.deleteSection(sectionId);
    }
    async createLesson(sectionId, courseId, dto, instructorId, isAdmin = false) {
        await this.assertCourseOwner(courseId, instructorId, isAdmin);
        return this.coursesService.createLesson(sectionId, courseId, dto);
    }
    async updateLesson(lessonId, dto, instructorId, isAdmin = false) {
        await this.assertLessonOwner(lessonId, instructorId, isAdmin);
        return this.coursesService.updateLesson(lessonId, dto);
    }
    async deleteLesson(lessonId, instructorId, isAdmin = false) {
        await this.assertLessonOwner(lessonId, instructorId, isAdmin);
        return this.coursesService.deleteLesson(lessonId);
    }
    async togglePublish(courseId, instructorId, isAdmin = false) {
        await this.assertCourseOwner(courseId, instructorId, isAdmin);
        return this.coursesService.togglePublish(courseId);
    }
};
exports.InstructorService = InstructorService;
exports.InstructorService = InstructorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(course_schema_1.Course.name)),
    __param(1, (0, mongoose_1.InjectModel)(section_schema_1.Section.name)),
    __param(2, (0, mongoose_1.InjectModel)(lesson_schema_1.Lesson.name)),
    __param(3, (0, mongoose_1.InjectModel)(enrollment_schema_1.Enrollment.name)),
    __param(4, (0, mongoose_1.InjectModel)(order_schema_1.Order.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        courses_service_1.CoursesService])
], InstructorService);
//# sourceMappingURL=instructor.service.js.map