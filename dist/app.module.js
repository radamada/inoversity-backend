"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const throttler_1 = require("@nestjs/throttler");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const courses_module_1 = require("./courses/courses.module");
const categories_module_1 = require("./categories/categories.module");
const cart_module_1 = require("./cart/cart.module");
const orders_module_1 = require("./orders/orders.module");
const payments_module_1 = require("./payments/payments.module");
const enrollments_module_1 = require("./enrollments/enrollments.module");
const media_module_1 = require("./media/media.module");
const reviews_module_1 = require("./reviews/reviews.module");
const admin_module_1 = require("./admin/admin.module");
const contact_module_1 = require("./contact/contact.module");
const stats_module_1 = require("./stats/stats.module");
const instructor_module_1 = require("./instructor/instructor.module");
const notifications_module_1 = require("./notifications/notifications.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    uri: config.get('MONGODB_URI'),
                }),
                inject: [config_1.ConfigService],
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            courses_module_1.CoursesModule,
            categories_module_1.CategoriesModule,
            cart_module_1.CartModule,
            orders_module_1.OrdersModule,
            payments_module_1.PaymentsModule,
            enrollments_module_1.EnrollmentsModule,
            media_module_1.MediaModule,
            reviews_module_1.ReviewsModule,
            admin_module_1.AdminModule,
            contact_module_1.ContactModule,
            stats_module_1.StatsModule,
            instructor_module_1.InstructorModule,
            notifications_module_1.NotificationsModule,
        ],
        providers: [{ provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard }],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map