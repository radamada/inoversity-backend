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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseSchema = exports.Course = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Course = class Course {
    title;
    slug;
    description;
    thumbnail;
    instructorId;
    price;
    categoryId;
    tags;
    published;
    rating;
    reviewCount;
    enrollmentCount;
    whatYouLearn;
    requirements;
    level;
    language;
};
exports.Course = Course;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Course.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, lowercase: true }),
    __metadata("design:type", String)
], Course.prototype, "slug", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Course.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], Course.prototype, "thumbnail", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Course.prototype, "instructorId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], Course.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Category', default: null }),
    __metadata("design:type", Object)
], Course.prototype, "categoryId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Course.prototype, "tags", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Course.prototype, "published", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0, min: 0, max: 5 }),
    __metadata("design:type", Number)
], Course.prototype, "rating", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Course.prototype, "reviewCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Course.prototype, "enrollmentCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Course.prototype, "whatYouLearn", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Course.prototype, "requirements", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], Course.prototype, "level", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'ro' }),
    __metadata("design:type", String)
], Course.prototype, "language", void 0);
exports.Course = Course = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Course);
exports.CourseSchema = mongoose_1.SchemaFactory.createForClass(Course);
exports.CourseSchema.index({ title: 'text', description: 'text', tags: 'text' });
//# sourceMappingURL=course.schema.js.map