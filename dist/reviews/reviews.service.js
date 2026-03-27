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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const review_schema_1 = require("./schemas/review.schema");
const enrollments_service_1 = require("../enrollments/enrollments.service");
const courses_service_1 = require("../courses/courses.service");
let ReviewsService = class ReviewsService {
    reviewModel;
    enrollmentsService;
    coursesService;
    constructor(reviewModel, enrollmentsService, coursesService) {
        this.reviewModel = reviewModel;
        this.enrollmentsService = enrollmentsService;
        this.coursesService = coursesService;
    }
    async getByCourse(courseId) {
        return this.reviewModel
            .find({ courseId: new mongoose_2.Types.ObjectId(courseId) })
            .populate('userId', 'name avatar')
            .sort({ createdAt: -1 })
            .exec();
    }
    async create(userId, courseId, rating, comment) {
        const isEnrolled = await this.enrollmentsService.isEnrolled(userId, courseId);
        if (!isEnrolled) {
            throw new common_1.BadRequestException('Trebuie să fii înscris pentru a lăsa o recenzie');
        }
        const existing = await this.reviewModel.findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            courseId: new mongoose_2.Types.ObjectId(courseId),
        });
        let review;
        if (existing) {
            existing.rating = rating;
            existing.comment = comment;
            review = await existing.save();
        }
        else {
            review = await new this.reviewModel({
                userId: new mongoose_2.Types.ObjectId(userId),
                courseId: new mongoose_2.Types.ObjectId(courseId),
                rating,
                comment,
            }).save();
        }
        await this.coursesService.updateRating(courseId);
        return review;
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(review_schema_1.Review.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        enrollments_service_1.EnrollmentsService,
        courses_service_1.CoursesService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map