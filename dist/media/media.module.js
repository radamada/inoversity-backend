"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const media_service_1 = require("./media.service");
const media_controller_1 = require("./media.controller");
const enrollments_module_1 = require("../enrollments/enrollments.module");
const lesson_schema_1 = require("../courses/schemas/lesson.schema");
let MediaModule = class MediaModule {
};
exports.MediaModule = MediaModule;
exports.MediaModule = MediaModule = __decorate([
    (0, common_1.Module)({
        imports: [
            enrollments_module_1.EnrollmentsModule,
            mongoose_1.MongooseModule.forFeature([{ name: lesson_schema_1.Lesson.name, schema: lesson_schema_1.LessonSchema }]),
        ],
        providers: [media_service_1.MediaService],
        controllers: [media_controller_1.MediaController, media_controller_1.PublicMediaController],
        exports: [media_service_1.MediaService],
    })
], MediaModule);
//# sourceMappingURL=media.module.js.map