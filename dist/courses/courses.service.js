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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoursesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const slugify_1 = __importDefault(require("slugify"));
const course_schema_1 = require("./schemas/course.schema");
const section_schema_1 = require("./schemas/section.schema");
const lesson_schema_1 = require("./schemas/lesson.schema");
const notifications_service_1 = require("../notifications/notifications.service");
let CoursesService = class CoursesService {
    courseModel;
    sectionModel;
    lessonModel;
    notificationsService;
    constructor(courseModel, sectionModel, lessonModel, notificationsService) {
        this.courseModel = courseModel;
        this.sectionModel = sectionModel;
        this.lessonModel = lessonModel;
        this.notificationsService = notificationsService;
    }
    async findAll(query, onlyPublished = true) {
        const filter = {};
        if (onlyPublished)
            filter.published = true;
        if (query.search) {
            filter.$text = { $search: query.search };
        }
        if (query.category)
            filter.categoryId = new mongoose_2.Types.ObjectId(query.category);
        if (query.level)
            filter.level = query.level;
        if (query.minPrice !== undefined || query.maxPrice !== undefined) {
            filter.price = {};
            if (query.minPrice !== undefined)
                filter.price.$gte = query.minPrice;
            if (query.maxPrice !== undefined)
                filter.price.$lte = query.maxPrice;
        }
        let sort = { createdAt: -1 };
        if (query.sortBy === 'price_asc')
            sort = { price: 1 };
        else if (query.sortBy === 'price_desc')
            sort = { price: -1 };
        else if (query.sortBy === 'rating')
            sort = { rating: -1 };
        else if (query.sortBy === 'popular')
            sort = { enrollmentCount: -1 };
        const page = query.page ?? 1;
        const limit = query.limit ?? 12;
        const skip = (page - 1) * limit;
        const [courses, total] = await Promise.all([
            this.courseModel
                .find(filter)
                .populate('instructorId', 'name avatar')
                .populate('categoryId', 'name slug')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .exec(),
            this.courseModel.countDocuments(filter),
        ]);
        return { courses, total, page, pages: Math.ceil(total / limit) };
    }
    async findBySlug(slug) {
        const course = await this.courseModel
            .findOne({ slug, published: true })
            .populate('instructorId', 'name avatar')
            .populate('categoryId', 'name slug')
            .exec();
        if (!course)
            throw new common_1.NotFoundException('Cursul nu a fost găsit');
        return course;
    }
    async findById(id) {
        const course = await this.courseModel
            .findById(id)
            .populate('instructorId', 'name avatar')
            .populate('categoryId', 'name slug')
            .exec();
        if (!course)
            throw new common_1.NotFoundException('Cursul nu a fost găsit');
        return course;
    }
    async create(dto, instructorId) {
        const slug = await this.generateUniqueSlug(dto.title);
        const course = new this.courseModel({
            ...dto,
            slug,
            instructorId: new mongoose_2.Types.ObjectId(instructorId),
            categoryId: dto.categoryId ? new mongoose_2.Types.ObjectId(dto.categoryId) : null,
        });
        return course.save();
    }
    async update(id, dto, userId, isAdmin = false) {
        if (!isAdmin) {
            const existing = await this.courseModel.findById(id).select('instructorId').lean();
            if (!existing)
                throw new common_1.NotFoundException('Cursul nu a fost găsit');
            if (existing.instructorId.toString() !== userId) {
                throw new common_1.ForbiddenException('Nu ai permisiunea de a modifica acest curs');
            }
        }
        const $set = { ...dto };
        if ($set.categoryId)
            $set.categoryId = new mongoose_2.Types.ObjectId($set.categoryId);
        else
            delete $set.categoryId;
        const updated = await this.courseModel
            .findByIdAndUpdate(id, { $set }, { new: true })
            .populate('instructorId', 'name avatar')
            .populate('categoryId', 'name slug')
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Cursul nu a fost găsit');
        await this.notificationsService.notifyEnrolledUsers(id, 'course_updated', `Cursul "${updated.title}" a fost actualizat`, `Instructorul a adus modificări cursului "${updated.title}". Intră să vezi ce s-a schimbat!`);
        return updated;
    }
    async togglePublish(id) {
        const course = await this.findById(id);
        course.published = !course.published;
        return course.save();
    }
    async delete(id) {
        const course = await this.findById(id);
        await this.sectionModel.deleteMany({ courseId: course._id });
        await this.lessonModel.deleteMany({ courseId: course._id });
        await course.deleteOne();
    }
    async getSections(courseId) {
        return this.sectionModel.find({ courseId }).sort({ order: 1 }).exec();
    }
    async createSection(courseId, title) {
        const count = await this.sectionModel.countDocuments({ courseId });
        const section = new this.sectionModel({
            courseId: new mongoose_2.Types.ObjectId(courseId),
            title,
            order: count,
        });
        return section.save();
    }
    async updateSection(sectionId, data) {
        const section = await this.sectionModel.findByIdAndUpdate(sectionId, { $set: data }, { new: true });
        if (!section)
            throw new common_1.NotFoundException('Secțiunea nu a fost găsită');
        return section;
    }
    async deleteSection(sectionId) {
        await this.lessonModel.deleteMany({ sectionId });
        await this.sectionModel.findByIdAndDelete(sectionId);
    }
    async getLessons(courseId) {
        return this.lessonModel.find({ courseId }).sort({ sectionId: 1, order: 1 }).exec();
    }
    async createLesson(sectionId, courseId, data) {
        const count = await this.lessonModel.countDocuments({ sectionId });
        const lesson = new this.lessonModel({
            ...data,
            courseId: new mongoose_2.Types.ObjectId(courseId),
            sectionId: new mongoose_2.Types.ObjectId(sectionId),
            order: count,
        });
        const saved = await lesson.save();
        const course = await this.courseModel.findById(courseId).select('title').lean();
        if (course) {
            await this.notificationsService.notifyEnrolledUsers(courseId, 'course_updated', `Lecție nouă în "${course.title}"`, `O lecție nouă${data.title ? ` — "${data.title}"` : ''} a fost adăugată la cursul "${course.title}". Continuă să înveți!`);
        }
        return saved;
    }
    async updateLesson(lessonId, data) {
        const lesson = await this.lessonModel.findByIdAndUpdate(lessonId, { $set: data }, { new: true });
        if (!lesson)
            throw new common_1.NotFoundException('Lecția nu a fost găsită');
        return lesson;
    }
    async deleteLesson(lessonId) {
        await this.lessonModel.findByIdAndDelete(lessonId);
    }
    async getCurriculum(courseId) {
        const cid = new mongoose_2.Types.ObjectId(courseId);
        const sections = await this.sectionModel
            .find({ courseId: cid })
            .sort({ order: 1 })
            .lean()
            .exec();
        const lessons = await this.lessonModel
            .find({ courseId: cid })
            .sort({ order: 1 })
            .lean()
            .exec();
        return sections.map((section) => ({
            ...section,
            lessons: lessons.filter((l) => l.sectionId.toString() === section._id.toString()),
        }));
    }
    async updateRating(courseId) {
        const Review = this.courseModel.db.model('Review');
        const result = await Review.aggregate([
            { $match: { courseId: new mongoose_2.Types.ObjectId(courseId) } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
        ]);
        if (result.length > 0) {
            await this.courseModel.findByIdAndUpdate(courseId, {
                rating: Math.round(result[0].avg * 10) / 10,
                reviewCount: result[0].count,
            });
        }
    }
    async generateUniqueSlug(title) {
        const base = (0, slugify_1.default)(title, { lower: true, strict: true });
        let slug = base;
        let i = 1;
        while (await this.courseModel.findOne({ slug })) {
            slug = `${base}-${i++}`;
        }
        return slug;
    }
};
exports.CoursesService = CoursesService;
exports.CoursesService = CoursesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(course_schema_1.Course.name)),
    __param(1, (0, mongoose_1.InjectModel)(section_schema_1.Section.name)),
    __param(2, (0, mongoose_1.InjectModel)(lesson_schema_1.Lesson.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        notifications_service_1.NotificationsService])
], CoursesService);
//# sourceMappingURL=courses.service.js.map