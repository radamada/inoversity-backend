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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../users/schemas/user.schema");
const course_schema_1 = require("../courses/schemas/course.schema");
const users_service_1 = require("../users/users.service");
const orders_service_1 = require("../orders/orders.service");
const enrollments_service_1 = require("../enrollments/enrollments.service");
let AdminService = class AdminService {
    userModel;
    courseModel;
    usersService;
    ordersService;
    enrollmentsService;
    constructor(userModel, courseModel, usersService, ordersService, enrollmentsService) {
        this.userModel = userModel;
        this.courseModel = courseModel;
        this.usersService = usersService;
        this.ordersService = ordersService;
        this.enrollmentsService = enrollmentsService;
    }
    async getStats() {
        const [totalUsers, totalCourses, publishedCourses, revenueStats] = await Promise.all([
            this.userModel.countDocuments(),
            this.courseModel.countDocuments(),
            this.courseModel.countDocuments({ published: true }),
            this.ordersService.getStats(),
        ]);
        return {
            totalUsers,
            totalCourses,
            publishedCourses,
            ...revenueStats,
        };
    }
    getUsers(page, limit) {
        return this.usersService.findAll(page, limit);
    }
    setUserRole(id, role) {
        return this.usersService.setRole(id, role);
    }
    setUserActive(id, isActive) {
        return this.usersService.setActive(id, isActive);
    }
    getOrders(page, limit) {
        return this.ordersService.findAll(page, limit);
    }
    refundOrder(orderId) {
        return this.ordersService.refund(orderId);
    }
    async getAllCourses(page, limit) {
        const skip = (page - 1) * limit;
        const [courses, total] = await Promise.all([
            this.courseModel
                .find()
                .populate('instructorId', 'name email')
                .populate('categoryId', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.courseModel.countDocuments(),
        ]);
        return { courses, total, page, pages: Math.ceil(total / limit) };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(course_schema_1.Course.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        users_service_1.UsersService,
        orders_service_1.OrdersService,
        enrollments_service_1.EnrollmentsService])
], AdminService);
//# sourceMappingURL=admin.service.js.map