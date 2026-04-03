import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
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
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class OrdersService {
  private stripe: Stripe;
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private coursesService: CoursesService,
    private cartService: CartService,
    private enrollmentsService: EnrollmentsService,
    private notificationsService: NotificationsService,
    private couponsService: CouponsService,
    private config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-04-10' as any,
    });
  }

  async createOrder(userId: string, couponCode?: string) {
    const cartItems = await this.cartService.getCartItems(userId);
    if (!cartItems.length) throw new BadRequestException('Coșul este gol');

    // Fetch course details for price snapshot
    const courses = await Promise.all(
      cartItems.map((id) => this.coursesService.findById(id.toString())),
    );
    const items = courses.map((course) => ({
      courseId: course._id as Types.ObjectId,
      title: course.title,
      price: course.price,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.price, 0);

    // Apply coupon server-side — never trust the frontend's discount value
    let discountAmount = 0;
    let couponUsedAt: Date | null = null;
    let appliedCouponCode: string | null = null;
    if (couponCode && couponCode.trim()) {
      const instructorIds = courses.map((c) => c.instructorId?.toString()).filter(Boolean) as string[];
      const instructorSubtotals: Record<string, number> = {};
      const coursePrices: Record<string, number> = {};
      for (const course of courses) {
        const instId = (course.instructorId as any)?._id?.toString() ?? course.instructorId?.toString();
        if (instId) instructorSubtotals[instId] = (instructorSubtotals[instId] ?? 0) + course.price;
        coursePrices[course._id.toString()] = course.price;
      }
      const result = await this.couponsService.applyCoupon(couponCode, subtotal, instructorIds, instructorSubtotals, coursePrices, userId);
      discountAmount = result.discountAmount;
      couponUsedAt = result.usedAt;
      appliedCouponCode = couponCode.trim().toUpperCase();
    }

    const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    // Free order (100% coupon) — skip Stripe, mark as paid directly
    if (total === 0) {
      const order = new this.orderModel({
        userId: new Types.ObjectId(userId),
        items,
        total: 0,
        discountAmount: Math.round(discountAmount * 100) / 100,
        couponCode: appliedCouponCode,
        status: 'paid',
      });
      await order.save();

      // Enroll user immediately
      for (const item of order.items) {
        await this.enrollmentsService.enroll(userId, item.courseId.toString(), order._id.toString());
      }

      const courseNames = order.items.map((i) => `"${i.title}"`).join(', ');
      await this.notificationsService.create(
        userId,
        'purchase',
        'Mulțumim pentru achiziție!',
        `Ai dobândit acces la ${order.items.length === 1 ? 'cursul' : 'cursurile'} ${courseNames}. Mult succes la învățat!`,
      );
      await this.cartService.clearCart(userId);

      return {
        orderId: order._id,
        clientSecret: null,
        total: 0,
        discountAmount: Math.round(discountAmount * 100) / 100,
        subtotal,
      };
    }

    // Create Stripe PaymentIntent — rollback coupon if this fails
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(total * 100), // RON in bani
        currency: 'ron',
        metadata: { userId },
        automatic_payment_methods: { enabled: true },
      });
    } catch (stripeErr: any) {
      if (appliedCouponCode) {
        await this.couponsService.rollbackUsage(appliedCouponCode, userId, couponUsedAt ?? undefined);
      }
      // Never leak Stripe error details to the client (may contain card/account info)
      this.logger.error(`Stripe PaymentIntent error: ${stripeErr?.message}`);
      throw new BadRequestException('Eroare la procesarea plății. Încearcă din nou.');
    }

    const order = new this.orderModel({
      userId: new Types.ObjectId(userId),
      items,
      total,
      discountAmount: Math.round(discountAmount * 100) / 100,
      couponCode: appliedCouponCode,
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret,
    });
    await order.save();

    return {
      orderId: order._id,
      clientSecret: paymentIntent.client_secret,
      total,
      discountAmount: Math.round(discountAmount * 100) / 100,
      subtotal,
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
    // Atomic transition: prevents double-processing from Stripe webhook retries
    const order = await this.orderModel.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId, status: 'pending' },
      { $set: { status: 'paid', stripeClientSecret: null } },
      { new: true },
    );
    if (!order) return; // already processed or not found

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

  async findAll(
    page = 1,
    limit = 20,
    filters: {
      status?: string;
      courseIds?: Types.ObjectId[];
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ) {
    const query: any = {};

    if (filters.status && ['paid', 'refunded', 'pending', 'cancelled'].includes(filters.status)) {
      query.status = filters.status;
    }
    if (filters.courseIds?.length) {
      query['items.courseId'] = { $in: filters.courseIds };
    }
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        query.createdAt.$lte = to;
      }
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.orderModel
        .find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(query),
    ]);
    return { orders, total, page, pages: Math.ceil(total / limit) };
  }

  async refund(orderId: string, adminId?: string): Promise<OrderDocument> {
    // Atomic status transition: only succeeds if current status is 'paid'
    const refundedByUpdate: Record<string, any> = { status: 'refunded' };
    if (adminId) {
      refundedByUpdate.refundedBy = new Types.ObjectId(adminId);
    }
    const order = await this.orderModel.findOneAndUpdate(
      { _id: orderId, status: 'paid' },
      { $set: refundedByUpdate },
      { new: false }, // return original doc so we have stripePaymentIntentId
    );
    if (!order) {
      const exists = await this.orderModel.exists({ _id: orderId });
      if (!exists) throw new NotFoundException('Comanda nu a fost găsită');
      throw new BadRequestException('Comanda nu poate fi rambursată');
    }

    if (order.stripePaymentIntentId) {
      try {
        await this.stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
        });
      } catch (stripeErr: any) {
        // Revert DB status — money not returned, don't revoke access
        await this.orderModel.updateOne({ _id: orderId }, { $set: { status: 'paid' } });
        this.logger.error(`Stripe refund error: ${stripeErr?.message}`);
        throw new BadRequestException('Rambursarea a eșuat. Contactează suportul.');
      }
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

  async createAndPayFake(userId: string, couponCode?: string) {
    const cartItems = await this.cartService.getCartItems(userId);
    if (!cartItems.length) throw new BadRequestException('Coșul este gol');

    const courses = await Promise.all(
      cartItems.map((id) => this.coursesService.findById(id.toString())),
    );
    const items = courses.map((course) => ({
      courseId: course._id as Types.ObjectId,
      title: course.title,
      price: course.price,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.price, 0);

    let discountAmount = 0;
    let appliedCouponCode: string | null = null;
    if (couponCode && couponCode.trim()) {
      const instructorIds = courses.map((c) => c.instructorId?.toString()).filter(Boolean) as string[];
      const instructorSubtotals: Record<string, number> = {};
      const coursePrices: Record<string, number> = {};
      for (const course of courses) {
        const instId = (course.instructorId as any)?._id?.toString() ?? course.instructorId?.toString();
        if (instId) instructorSubtotals[instId] = (instructorSubtotals[instId] ?? 0) + course.price;
        coursePrices[course._id.toString()] = course.price;
      }
      const result = await this.couponsService.applyCoupon(couponCode, subtotal, instructorIds, instructorSubtotals, coursePrices, userId);
      discountAmount = result.discountAmount;
      appliedCouponCode = couponCode.trim().toUpperCase();
    }

    const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    const order = new this.orderModel({
      userId: new Types.ObjectId(userId),
      items,
      total,
      discountAmount: Math.round(discountAmount * 100) / 100,
      couponCode: appliedCouponCode,
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

    return { orderId: order._id, total, discountAmount: Math.round(discountAmount * 100) / 100, subtotal };
  }

  async getMonthlyRevenue(): Promise<{ month: string; revenue: number }[]> {
    const raw = await this.orderModel.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const map = new Map<string, number>(
      raw.map((r) => [
        `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
        Math.round(r.revenue * 100) / 100,
      ]),
    );

    const months: { month: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: key, revenue: map.get(key) ?? 0 });
    }
    return months;
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
