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
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const cart_schema_1 = require("./schemas/cart.schema");
const courses_service_1 = require("../courses/courses.service");
const enrollments_service_1 = require("../enrollments/enrollments.service");
let CartService = class CartService {
    cartModel;
    coursesService;
    enrollmentsService;
    constructor(cartModel, coursesService, enrollmentsService) {
        this.cartModel = cartModel;
        this.coursesService = coursesService;
        this.enrollmentsService = enrollmentsService;
    }
    async getCart(userId) {
        const uid = new mongoose_2.Types.ObjectId(userId);
        const cart = await this.cartModel
            .findOne({ userId: uid })
            .populate('items', 'title slug thumbnail price rating instructorId')
            .exec();
        return cart ?? { userId, items: [] };
    }
    async addItem(userId, courseId) {
        const course = await this.coursesService.findById(courseId);
        if (!course.published)
            throw new common_1.BadRequestException('Cursul nu este disponibil');
        const isEnrolled = await this.enrollmentsService.isEnrolled(userId, courseId);
        if (isEnrolled)
            throw new common_1.BadRequestException('Ești deja înscris la acest curs');
        const uid = new mongoose_2.Types.ObjectId(userId);
        await this.cartModel.findOneAndUpdate({ userId: uid }, { $addToSet: { items: new mongoose_2.Types.ObjectId(courseId) } }, { upsert: true, setDefaultsOnInsert: true, new: true });
        return this.getCart(userId);
    }
    async removeItem(userId, courseId) {
        await this.cartModel.findOneAndUpdate({ userId: new mongoose_2.Types.ObjectId(userId) }, { $pull: { items: new mongoose_2.Types.ObjectId(courseId) } });
        return this.getCart(userId);
    }
    async clearCart(userId) {
        await this.cartModel.findOneAndUpdate({ userId: new mongoose_2.Types.ObjectId(userId) }, { $set: { items: [] } });
    }
    async getCartItems(userId) {
        const cart = await this.cartModel.findOne({ userId: new mongoose_2.Types.ObjectId(userId) }).exec();
        return cart?.items ?? [];
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(cart_schema_1.Cart.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        courses_service_1.CoursesService,
        enrollments_service_1.EnrollmentsService])
], CartService);
//# sourceMappingURL=cart.service.js.map