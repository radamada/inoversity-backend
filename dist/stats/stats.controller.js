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
exports.StatsController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const swagger_1 = require("@nestjs/swagger");
const user_schema_1 = require("../users/schemas/user.schema");
const course_schema_1 = require("../courses/schemas/course.schema");
let StatsController = class StatsController {
    userModel;
    courseModel;
    constructor(userModel, courseModel) {
        this.userModel = userModel;
        this.courseModel = courseModel;
    }
    async getStats() {
        const [courses, students, instructors] = await Promise.all([
            this.courseModel.countDocuments({ published: true }),
            this.userModel.countDocuments({ role: 'student' }),
            this.userModel.countDocuments({ role: 'instructor' }),
        ]);
        return { courses, students, instructors };
    }
};
exports.StatsController = StatsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Statistici publice platformă' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatsController.prototype, "getStats", null);
exports.StatsController = StatsController = __decorate([
    (0, swagger_1.ApiTags)('stats'),
    (0, common_1.Controller)('stats'),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(course_schema_1.Course.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], StatsController);
//# sourceMappingURL=stats.controller.js.map