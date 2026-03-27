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
exports.EnrollmentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const enrollment_schema_1 = require("./schemas/enrollment.schema");
const lesson_schema_1 = require("../courses/schemas/lesson.schema");
const course_schema_1 = require("../courses/schemas/course.schema");
let EnrollmentsService = class EnrollmentsService {
    enrollmentModel;
    lessonModel;
    courseModel;
    constructor(enrollmentModel, lessonModel, courseModel) {
        this.enrollmentModel = enrollmentModel;
        this.lessonModel = lessonModel;
        this.courseModel = courseModel;
    }
    async enroll(userId, courseId, orderId) {
        const existing = await this.enrollmentModel.findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            courseId: new mongoose_2.Types.ObjectId(courseId),
        });
        if (existing) {
            if (existing.status === 'refunded') {
                existing.status = 'active';
                existing.orderId = new mongoose_2.Types.ObjectId(orderId);
                await existing.save();
                await this.courseModel.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });
            }
            return existing;
        }
        const enrollment = new this.enrollmentModel({
            userId: new mongoose_2.Types.ObjectId(userId),
            courseId: new mongoose_2.Types.ObjectId(courseId),
            orderId: new mongoose_2.Types.ObjectId(orderId),
        });
        const saved = await enrollment.save();
        await this.courseModel.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });
        return saved;
    }
    async isEnrolled(userId, courseId) {
        const count = await this.enrollmentModel.countDocuments({
            userId: new mongoose_2.Types.ObjectId(userId),
            courseId: new mongoose_2.Types.ObjectId(courseId),
            status: 'active',
        });
        return count > 0;
    }
    async revokeEnrollments(userId, courseIds) {
        await this.enrollmentModel.updateMany({
            userId: new mongoose_2.Types.ObjectId(userId),
            courseId: { $in: courseIds.map((id) => new mongoose_2.Types.ObjectId(id)) },
            status: 'active',
        }, { $set: { status: 'refunded' } });
        await this.courseModel.updateMany({ _id: { $in: courseIds.map((id) => new mongoose_2.Types.ObjectId(id)) }, enrollmentCount: { $gt: 0 } }, { $inc: { enrollmentCount: -1 } });
    }
    async getMyEnrollments(userId) {
        return this.enrollmentModel
            .find({ userId: new mongoose_2.Types.ObjectId(userId) })
            .populate({
            path: 'courseId',
            select: 'title slug thumbnail instructorId rating',
            populate: { path: 'instructorId', select: 'name avatar' },
        })
            .sort({ createdAt: -1 })
            .exec();
    }
    async getProgress(userId, courseId) {
        const enrollment = await this.enrollmentModel.findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            courseId: new mongoose_2.Types.ObjectId(courseId),
        });
        if (!enrollment)
            throw new common_1.NotFoundException('Nu ești înscris la acest curs');
        if (enrollment.status === 'refunded')
            throw new common_1.ForbiddenException('Accesul la acest curs a fost revocat');
        if (!enrollment.completedAt && enrollment.completedLessons.length > 0) {
            const totalLessons = await this.lessonModel.countDocuments({
                courseId: new mongoose_2.Types.ObjectId(courseId),
            });
            if (totalLessons > 0 && enrollment.completedLessons.length >= totalLessons) {
                enrollment.completedAt = new Date();
                await enrollment.save();
            }
        }
        return enrollment;
    }
    async markLessonComplete(userId, courseId, lessonId) {
        const enrollment = await this.enrollmentModel.findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            courseId: new mongoose_2.Types.ObjectId(courseId),
        });
        if (!enrollment)
            throw new common_1.NotFoundException('Nu ești înscris la acest curs');
        if (enrollment.status === 'refunded')
            throw new common_1.ForbiddenException('Accesul la acest curs a fost revocat');
        const lessonOid = new mongoose_2.Types.ObjectId(lessonId);
        const alreadyDone = enrollment.completedLessons.some((id) => id.toString() === lessonId);
        if (!alreadyDone) {
            enrollment.completedLessons.push(lessonOid);
        }
        enrollment.lastAccessedAt = new Date();
        if (!enrollment.completedAt) {
            const totalLessons = await this.lessonModel.countDocuments({
                courseId: new mongoose_2.Types.ObjectId(courseId),
            });
            if (totalLessons > 0 && enrollment.completedLessons.length >= totalLessons) {
                enrollment.completedAt = new Date();
            }
        }
        return enrollment.save();
    }
    async countByCourse(courseId) {
        return this.enrollmentModel.countDocuments({ courseId: new mongoose_2.Types.ObjectId(courseId) });
    }
    async findAll(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [enrollments, total] = await Promise.all([
            this.enrollmentModel
                .find()
                .populate('userId', 'name email')
                .populate('courseId', 'title')
                .skip(skip)
                .limit(limit)
                .exec(),
            this.enrollmentModel.countDocuments(),
        ]);
        return { enrollments, total, page, pages: Math.ceil(total / limit) };
    }
};
exports.EnrollmentsService = EnrollmentsService;
exports.EnrollmentsService = EnrollmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(enrollment_schema_1.Enrollment.name)),
    __param(1, (0, mongoose_1.InjectModel)(lesson_schema_1.Lesson.name)),
    __param(2, (0, mongoose_1.InjectModel)(course_schema_1.Course.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], EnrollmentsService);
//# sourceMappingURL=enrollments.service.js.map