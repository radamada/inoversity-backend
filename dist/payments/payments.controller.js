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
var PaymentsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
const orders_service_1 = require("../orders/orders.service");
let PaymentsController = PaymentsController_1 = class PaymentsController {
    ordersService;
    config;
    stripe;
    logger = new common_1.Logger(PaymentsController_1.name);
    constructor(ordersService, config) {
        this.ordersService = ordersService;
        this.config = config;
        this.stripe = new stripe_1.default(this.config.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2024-04-10',
        });
    }
    async handleWebhook(req, res, sig) {
        const webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET');
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(req.rawBody ?? req.body, sig, webhookSecret ?? '');
        }
        catch (err) {
            this.logger.error(`Webhook signature error: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            try {
                await this.ordersService.confirmPayment(paymentIntent.id);
                this.logger.log(`Payment confirmed: ${paymentIntent.id}`);
            }
            catch (err) {
                this.logger.error(`Error confirming payment: ${err.message}`);
            }
        }
        res.json({ received: true });
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Stripe webhook – confirmare plată' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Headers)('stripe-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "handleWebhook", null);
exports.PaymentsController = PaymentsController = PaymentsController_1 = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, common_1.Controller)('orders'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService,
        config_1.ConfigService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map