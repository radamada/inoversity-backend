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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const stripe_1 = __importDefault(require("stripe"));
const config_1 = require("@nestjs/config");
const order_schema_1 = require("./schemas/order.schema");
const courses_service_1 = require("../courses/courses.service");
const cart_service_1 = require("../cart/cart.service");
const enrollments_service_1 = require("../enrollments/enrollments.service");
const notifications_service_1 = require("../notifications/notifications.service");
let OrdersService = class OrdersService {
    orderModel;
    coursesService;
    cartService;
    enrollmentsService;
    notificationsService;
    config;
    stripe;
    constructor(orderModel, coursesService, cartService, enrollmentsService, notificationsService, config) {
        this.orderModel = orderModel;
        this.coursesService = coursesService;
        this.cartService = cartService;
        this.enrollmentsService = enrollmentsService;
        this.notificationsService = notificationsService;
        this.config = config;
        this.stripe = new stripe_1.default(this.config.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2024-04-10',
        });
    }
    async createOrder(userId) {
        const cartItems = await this.cartService.getCartItems(userId);
        if (!cartItems.length)
            throw new common_1.BadRequestException('Coșul este gol');
        const items = await Promise.all(cartItems.map(async (id) => {
            const course = await this.coursesService.findById(id.toString());
            return {
                courseId: course._id,
                title: course.title,
                price: course.price,
            };
        }));
        const total = items.reduce((sum, i) => sum + i.price, 0);
        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: Math.round(total * 100),
            currency: 'ron',
            metadata: { userId },
            automatic_payment_methods: { enabled: true },
        });
        const order = new this.orderModel({
            userId: new mongoose_2.Types.ObjectId(userId),
            items,
            total,
            stripePaymentIntentId: paymentIntent.id,
            stripeClientSecret: paymentIntent.client_secret,
        });
        await order.save();
        return {
            orderId: order._id,
            clientSecret: paymentIntent.client_secret,
            total,
        };
    }
    async getMyOrders(userId) {
        return this.orderModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .exec();
    }
    async getOrderById(id, userId) {
        const order = await this.orderModel.findById(id);
        if (!order)
            throw new common_1.NotFoundException('Comanda nu a fost găsită');
        if (order.userId.toString() !== userId)
            throw new common_1.NotFoundException('Comanda nu a fost găsită');
        return order;
    }
    async confirmPayment(paymentIntentId) {
        const order = await this.orderModel.findOne({ stripePaymentIntentId: paymentIntentId });
        if (!order || order.status !== 'pending')
            return;
        order.status = 'paid';
        order.stripeClientSecret = null;
        await order.save();
        for (const item of order.items) {
            await this.enrollmentsService.enroll(order.userId.toString(), item.courseId.toString(), order._id.toString());
        }
        const courseNames = order.items.map((i) => `"${i.title}"`).join(', ');
        await this.notificationsService.create(order.userId.toString(), 'purchase', 'Mulțumim pentru achiziție!', `Ai dobândit acces la ${order.items.length === 1 ? 'cursul' : 'cursurile'} ${courseNames}. Mult succes la învățat!`);
        await this.cartService.clearCart(order.userId.toString());
    }
    async findAll(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            this.orderModel
                .find()
                .populate('userId', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.orderModel.countDocuments(),
        ]);
        return { orders, total, page, pages: Math.ceil(total / limit) };
    }
    async refund(orderId) {
        const order = await this.orderModel.findOneAndUpdate({ _id: orderId, status: 'paid' }, { $set: { status: 'refunded' } }, { new: false });
        if (!order) {
            const exists = await this.orderModel.exists({ _id: orderId });
            if (!exists)
                throw new common_1.NotFoundException('Comanda nu a fost găsită');
            throw new common_1.BadRequestException('Comanda nu poate fi rambursată');
        }
        if (order.stripePaymentIntentId) {
            await this.stripe.refunds.create({
                payment_intent: order.stripePaymentIntentId,
            });
        }
        const courseIds = order.items.map((i) => i.courseId.toString());
        await this.enrollmentsService.revokeEnrollments(order.userId.toString(), courseIds);
        const courseNames = order.items.map((i) => `"${i.title}"`).join(', ');
        await this.notificationsService.create(order.userId.toString(), 'refund', 'Rambursare procesată', `Comanda ta a fost rambursată. Accesul la ${order.items.length === 1 ? 'cursul' : 'cursurile'} ${courseNames} a fost revocat.`);
        return (await this.orderModel.findById(orderId));
    }
    async createAndPayFake(userId) {
        const cartItems = await this.cartService.getCartItems(userId);
        if (!cartItems.length)
            throw new common_1.BadRequestException('Coșul este gol');
        const items = await Promise.all(cartItems.map(async (id) => {
            const course = await this.coursesService.findById(id.toString());
            return {
                courseId: course._id,
                title: course.title,
                price: course.price,
            };
        }));
        const total = items.reduce((sum, i) => sum + i.price, 0);
        const order = new this.orderModel({
            userId: new mongoose_2.Types.ObjectId(userId),
            items,
            total,
            status: 'paid',
        });
        await order.save();
        for (const item of order.items) {
            await this.enrollmentsService.enroll(userId, item.courseId.toString(), order._id.toString());
        }
        const courseNames = order.items.map((i) => `"${i.title}"`).join(', ');
        await this.notificationsService.create(userId, 'purchase', 'Mulțumim pentru achiziție!', `Ai dobândit acces la ${order.items.length === 1 ? 'cursul' : 'cursurile'} ${courseNames}. Mult succes la învățat!`);
        await this.cartService.clearCart(userId);
        return { orderId: order._id, total };
    }
    async getStats() {
        const [totalRevenue, totalOrders, pendingOrders] = await Promise.all([
            this.orderModel.aggregate([
                { $match: { status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            this.orderModel.countDocuments({ status: 'paid' }),
            this.orderModel.countDocuments({ status: 'pending' }),
        ]);
        return {
            totalRevenue: totalRevenue[0]?.total ?? 0,
            totalOrders,
            pendingOrders,
        };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(order_schema_1.Order.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        courses_service_1.CoursesService,
        cart_service_1.CartService,
        enrollments_service_1.EnrollmentsService,
        notifications_service_1.NotificationsService,
        config_1.ConfigService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map