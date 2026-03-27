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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const notification_schema_1 = require("./schemas/notification.schema");
const enrollment_schema_1 = require("../enrollments/schemas/enrollment.schema");
let NotificationsService = class NotificationsService {
    notificationModel;
    enrollmentModel;
    constructor(notificationModel, enrollmentModel) {
        this.notificationModel = notificationModel;
        this.enrollmentModel = enrollmentModel;
    }
    async create(userId, type, title, message, courseId) {
        const notification = new this.notificationModel({
            userId: new mongoose_2.Types.ObjectId(userId),
            type,
            title,
            message,
            courseId: courseId ? new mongoose_2.Types.ObjectId(courseId) : null,
        });
        return notification.save();
    }
    async notifyEnrolledUsers(courseId, type, title, message) {
        const enrollments = await this.enrollmentModel
            .find({ courseId: new mongoose_2.Types.ObjectId(courseId) })
            .select('userId')
            .lean();
        if (!enrollments.length)
            return;
        await this.notificationModel.insertMany(enrollments.map((e) => ({
            userId: e.userId,
            type,
            title,
            message,
            courseId: new mongoose_2.Types.ObjectId(courseId),
        })));
    }
    async getForUser(userId, limit = 20) {
        const [notifications, unreadCount] = await Promise.all([
            this.notificationModel
                .find({ userId: new mongoose_2.Types.ObjectId(userId) })
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean(),
            this.notificationModel.countDocuments({
                userId: new mongoose_2.Types.ObjectId(userId),
                read: false,
            }),
        ]);
        return { notifications, unreadCount };
    }
    async markRead(userId, notificationId) {
        await this.notificationModel.findOneAndUpdate({ _id: new mongoose_2.Types.ObjectId(notificationId), userId: new mongoose_2.Types.ObjectId(userId) }, { read: true });
    }
    async markAllRead(userId) {
        await this.notificationModel.updateMany({ userId: new mongoose_2.Types.ObjectId(userId), read: false }, { read: true });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(notification_schema_1.Notification.name)),
    __param(1, (0, mongoose_1.InjectModel)(enrollment_schema_1.Enrollment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map