import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { Order, OrderDocument } from './schemas/order.schema';
import { CoursesService } from '../courses/courses.service';
import { CartService } from '../cart/cart.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private coursesService: CoursesService,
    private cartService: CartService,
    private enrollmentsService: EnrollmentsService,
    private notificationsService: NotificationsService,
    private config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-04-10' as any,
    });
  }

  async createOrder(userId: string) {
    const cartItems = await this.cartService.getCartItems(userId);
    if (!cartItems.length) throw new BadRequestException('Coșul este gol');

    // Fetch course details for price snapshot
    const items = await Promise.all(
      cartItems.map(async (id) => {
        const course = await this.coursesService.findById(id.toString());
        return {
          courseId: course._id as Types.ObjectId,
          title: course.title,
          price: course.price,
        };
      }),
    );

    const total = items.reduce((sum, i) => sum + i.price, 0);

    // Create Stripe PaymentIntent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(total * 100), // RON in bani
      currency: 'ron',
      metadata: { userId },
      automatic_payment_methods: { enabled: true },
    });

    const order = new this.orderModel({
      userId: new Types.ObjectId(userId),
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

  async getMyOrders(userId: string) {
    return this.orderModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getOrderById(id: string, userId: string) {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Comanda nu a fost găsită');
    if (order.userId.toString() !== userId) throw new NotFoundException('Comanda nu a fost găsită');
    return order;
  }

  async confirmPayment(paymentIntentId: string): Promise<void> {
    const order = await this.orderModel.findOne({ stripePaymentIntentId: paymentIntentId });
    if (!order || order.status !== 'pending') return;

    order.status = 'paid';
    order.stripeClientSecret = null;
    await order.save();

    // Enroll user in each course
    for (const item of order.items) {
      await this.enrollmentsService.enroll(
        order.userId.toString(),
        item.courseId.toString(),
        order._id.toString(),
      );
    }

    // Purchase notification
    const courseNames = order.items.map((i) => `"${i.title}"`).join(', ');
    await this.notificationsService.create(
      order.userId.toString(),
      'purchase',
      'Mulțumim pentru achiziție!',
      `Ai dobândit acces la ${order.items.length === 1 ? 'cursul' : 'cursurile'} ${courseNames}. Mult succes la învățat!`,
    );

    // Clear cart
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

  async refund(orderId: string): Promise<OrderDocument> {
    // Atomic status transition: only succeeds if current status is 'paid'
    const order = await this.orderModel.findOneAndUpdate(
      { _id: orderId, status: 'paid' },
      { $set: { status: 'refunded' } },
      { new: false }, // return original doc so we have stripePaymentIntentId
    );
    if (!order) {
      const exists = await this.orderModel.exists({ _id: orderId });
      if (!exists) throw new NotFoundException('Comanda nu a fost găsită');
      throw new BadRequestException('Comanda nu poate fi rambursată');
    }

    if (order.stripePaymentIntentId) {
      await this.stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
      });
    }

    // Revoke enrollments
    const courseIds = order.items.map((i) => i.courseId.toString());
    await this.enrollmentsService.revokeEnrollments(order.userId.toString(), courseIds);

    // Refund notification
    const courseNames = order.items.map((i) => `"${i.title}"`).join(', ');
    await this.notificationsService.create(
      order.userId.toString(),
      'refund',
      'Rambursare procesată',
      `Comanda ta a fost rambursată. Accesul la ${order.items.length === 1 ? 'cursul' : 'cursurile'} ${courseNames} a fost revocat.`,
    );

    return (await this.orderModel.findById(orderId))!;
  }

  async createAndPayFake(userId: string) {
    const cartItems = await this.cartService.getCartItems(userId);
    if (!cartItems.length) throw new BadRequestException('Coșul este gol');

    const items = await Promise.all(
      cartItems.map(async (id) => {
        const course = await this.coursesService.findById(id.toString());
        return {
          courseId: course._id as Types.ObjectId,
          title: course.title,
          price: course.price,
        };
      }),
    );

    const total = items.reduce((sum, i) => sum + i.price, 0);

    const order = new this.orderModel({
      userId: new Types.ObjectId(userId),
      items,
      total,
      status: 'paid',
    });
    await order.save();

    for (const item of order.items) {
      await this.enrollmentsService.enroll(
        userId,
        item.courseId.toString(),
        order._id.toString(),
      );
    }

    // Purchase notification
    const courseNames = order.items.map((i) => `"${i.title}"`).join(', ');
    await this.notificationsService.create(
      userId,
      'purchase',
      'Mulțumim pentru achiziție!',
      `Ai dobândit acces la ${order.items.length === 1 ? 'cursul' : 'cursurile'} ${courseNames}. Mult succes la învățat!`,
    );

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
}
