import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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
import { WishlistService } from '../wishlist/wishlist.service';

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
    private wishlistService: WishlistService,
    private config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-04-10' as any,
    });
  }

  async createOrder(userId: string, couponCode?: string) {
    // M2: Prevent duplicate pending orders — if user already has a pending order
    // with the same courses, return the existing one instead of creating a new PaymentIntent
    const cartItems = await this.cartService.getCartItems(userId);
    if (!cartItems.length) throw new BadRequestException('Coșul este gol');

    const cartCourseIds = cartItems.map((id) => id.toString()).sort();

    const existingPending = await this.orderModel.findOne({
      userId: new Types.ObjectId(userId),
      status: 'pending',
      createdAt: { $gt: new Date(Date.now() - 30 * 60 * 1000) }, // within last 30 min
    }).lean();

    if (existingPending) {
      const existingCourseIds = existingPending.items.map((i) => i.courseId.toString()).sort();
      if (JSON.stringify(existingCourseIds) === JSON.stringify(cartCourseIds) && existingPending.stripeClientSecret) {
        return {
          orderId: existingPending._id,
          clientSecret: existingPending.stripeClientSecret,
          total: existingPending.total,
          discountAmount: existingPending.discountAmount,
          subtotal: existingPending.items.reduce((sum, i) => sum + i.price, 0),
        };
      }
    }

    // Fetch course details for price snapshot
    const courses = await Promise.all(
      cartItems.map((id) => this.coursesService.findById(id.toString())),
    );

    // Prevent purchasing unpublished courses (could have been unpublished after cart add)
    const unpublished = courses.find((c) => !c.published);
    if (unpublished) {
      throw new BadRequestException(`Cursul "${unpublished.title}" nu mai este disponibil.`);
    }

    // M1: Check if user is already enrolled in any of these courses (single $in query)
    const courseIds = courses.map((c) => c._id.toString());
    const alreadyEnrolledIds = await this.enrollmentsService.findAlreadyEnrolledCourseIds(userId, courseIds);
    if (alreadyEnrolledIds.length > 0) {
      const duplicate = courses.find((c) => alreadyEnrolledIds.includes(c._id.toString()));
      throw new BadRequestException(`Ești deja înscris la cursul "${duplicate!.title}"`);
    }

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
      // NOTE: coursesService.findById() populates `instructorId` into a User doc,
      // so plain `.toString()` returns "[object Object]". Always extract `_id` first.
      const instructorSubtotals: Record<string, number> = {};
      const coursePrices: Record<string, number> = {};
      const instructorIdSet = new Set<string>();
      for (const course of courses) {
        const instId = (course.instructorId as any)?._id?.toString() ?? course.instructorId?.toString();
        if (instId) {
          instructorSubtotals[instId] = (instructorSubtotals[instId] ?? 0) + course.price;
          instructorIdSet.add(instId);
        }
        coursePrices[course._id.toString()] = course.price;
      }
      const instructorIds = Array.from(instructorIdSet);
      const result = await this.couponsService.applyCoupon(couponCode, subtotal, instructorIds, instructorSubtotals, coursePrices, userId);
      discountAmount = result.discountAmount;
      couponUsedAt = result.usedAt;
      appliedCouponCode = couponCode.trim().toUpperCase();
    }

    const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    // Free order (100% coupon) — skip Stripe, mark as paid directly
    if (total === 0) {
      // Start as 'confirming' — only promote to 'paid' after enrollments succeed
      const order = new this.orderModel({
        userId: new Types.ObjectId(userId),
        items,
        total: 0,
        discountAmount: Math.round(discountAmount * 100) / 100,
        couponCode: appliedCouponCode,
        couponUsedAt,
        status: 'confirming',
      });
      await order.save();

      // Enroll user — if any enrollment fails, mark order failed and propagate
      try {
        for (const item of order.items) {
          await this.enrollmentsService.enroll(userId, item.courseId.toString(), order._id.toString());
        }
        await this.orderModel.updateOne({ _id: order._id }, { $set: { status: 'paid' } });
      } catch (err: any) {
        await this.orderModel.updateOne({ _id: order._id }, { $set: { status: 'pending' } });
        if (appliedCouponCode) {
          await this.couponsService.rollbackUsage(appliedCouponCode, userId, couponUsedAt ?? undefined)
            .catch((e) => this.logger.error(`Coupon rollback failed [${appliedCouponCode}]: ${e?.message}`));
        }
        this.logger.error(`Free order enrollment failed for user ${userId}: ${err?.message}`);
        throw new BadRequestException('Eroare la activarea cursului. Te rugăm să încerci din nou.');
      }

      // Non-blocking post-payment tasks — order is already paid & user enrolled.
      // Failures here don't affect the user's access and are logged for monitoring.
      const courseNames = order.items.map((i) => `"${i.title}"`).join(', ');
      this.notificationsService.create(
        userId,
        'purchase',
        'Mulțumim pentru achiziție!',
        `Ai dobândit acces la ${order.items.length === 1 ? 'cursul' : 'cursurile'} ${courseNames}. Mult succes la învățat!`,
        undefined,
        order._id.toString(),
      ).catch((err) => this.logger.error(`Notification failed for order ${order._id}: ${err?.message}`));
      this.cartService.clearCart(userId)
        .catch((err) => this.logger.error(`Cart clear failed for user ${userId}: ${err?.message}`));
      this.wishlistService.removePurchasedCourses(userId, order.items.map((i) => i.courseId.toString()))
        .catch((err) => this.logger.error(`Wishlist cleanup failed for user ${userId}: ${err?.message}`));

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
      couponUsedAt,
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

  async getMyOrders(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.orderModel
        .find({ userId })
        .select('-stripeClientSecret -stripePaymentIntentId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({ userId }),
    ]);
    return { orders, total, page, pages: Math.ceil(total / limit) };
  }

  async getOrderById(id: string, userId: string) {
    const order = await this.orderModel.findById(id).select('-stripeClientSecret -stripePaymentIntentId');
    if (!order) throw new NotFoundException('Comanda nu a fost găsită');
    if (order.userId.toString() !== userId) throw new NotFoundException('Comanda nu a fost găsită');
    return order;
  }

  /**
   * Confirms a Stripe payment and enrolls the user in purchased courses.
   *
   * Uses a two-phase status approach to survive enrollment failures:
   *   pending → confirming (atomic, blocks duplicate webhook processing)
   *   confirming → paid    (after all enrollments succeed)
   *   confirming → pending (if enrollments fail, so Stripe can retry)
   *
   * Returns true if the order was newly confirmed, false if already processed.
   */
  async confirmPayment(paymentIntentId: string, amountReceived?: number | null): Promise<boolean> {
    // Phase 1: Atomic claim — transition pending → confirming.
    // Only one instance/request can succeed this update at a time.
    const order = await this.orderModel.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId, status: 'pending' },
      { $set: { status: 'confirming', stripeClientSecret: null } },
      { new: true },
    );
    if (!order) return false; // already confirmed or not found

    // Defense-in-depth: nu acorda acces dacă suma încasată e mai mică decât
    // totalul comenzii. În fluxul normal coincid (amount-ul PI e setat
    // server-side la create), dar un PI ajuns `succeeded` cu underpayment nu
    // trebuie să dea înscriere. Fail-closed: lasă comanda în `confirming`
    // pentru review manual, fără enroll. Event-ul Stripe e deja marcat procesat,
    // deci nu se reîncearcă la nesfârșit.
    const expectedAmount = Math.round(order.total * 100);
    if (amountReceived != null && amountReceived < expectedAmount) {
      this.logger.error(
        `Underpayment pe order ${order._id}: încasat ${amountReceived} bani, ` +
          `așteptat ${expectedAmount} bani (PI ${paymentIntentId}). NU se acordă acces — review manual.`,
      );
      return false;
    }

    try {
      // Phase 2: Enroll user in each purchased course
      for (const item of order.items) {
        await this.enrollmentsService.enroll(
          order.userId.toString(),
          item.courseId.toString(),
          order._id.toString(),
        );
      }

      // Phase 3: All enrollments succeeded — mark as paid
      await this.orderModel.updateOne(
        { _id: order._id },
        { $set: { status: 'paid' } },
      );
    } catch (err: any) {
      // Enrollment failed — revert to pending so Stripe webhook retry can re-attempt
      this.logger.error(
        `Enrollment failed for order ${order._id}, reverting to pending for retry: ${err?.message}`,
      );
      await this.orderModel.updateOne(
        { _id: order._id },
        { $set: { status: 'pending' } },
      );
      throw err; // propagate so webhook controller returns 500 → Stripe retries
    }

    // Non-critical operations — outside the critical path, failures don't affect enrollment
    const courseNames = order.items.map((i) => `"${i.title}"`).join(', ');
    await this.notificationsService.create(
      order.userId.toString(),
      'purchase',
      'Mulțumim pentru achiziție!',
      `Ai dobândit acces la ${order.items.length === 1 ? 'cursul' : 'cursurile'} ${courseNames}. Mult succes la învățat!`,
      undefined,
      order._id.toString(),
    ).catch((err) => this.logger.error(`Purchase notification failed for order ${order._id}: ${err?.message}`));

    await this.cartService.clearCart(order.userId.toString()).catch((err) =>
      this.logger.error(`Cart clear failed for user ${order.userId}: ${err?.message}`),
    );

    await this.wishlistService.removePurchasedCourses(
      order.userId.toString(),
      order.items.map((i) => i.courseId.toString()),
    ).catch((err) => this.logger.error(`Wishlist cleanup failed for user ${order.userId}: ${err?.message}`));

    return true;
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

    if (filters.status && ['paid', 'refunded', 'pending', 'confirming', 'cancelled'].includes(filters.status)) {
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

    // Build query without status filter to compute available statuses
    const queryWithoutStatus = { ...query };
    delete queryWithoutStatus.status;

    const skip = (page - 1) * limit;
    const [orders, total, availableStatuses] = await Promise.all([
      this.orderModel
        .find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(query),
      this.orderModel.distinct('status', queryWithoutStatus),
    ]);
    return { orders, total, page, pages: Math.ceil(total / limit), availableStatuses };
  }

  async refund(orderId: string, adminId?: string): Promise<OrderDocument> {
    // Atomic status transition: only succeeds if current status is 'paid'.
    // Fraud prevention is baked into the filter: if adminId matches userId,
    // the update simply won't match — no separate rollback needed.
    const refundedByUpdate: Record<string, any> = { status: 'refunded' };
    if (adminId) {
      refundedByUpdate.refundedBy = new Types.ObjectId(adminId);
    }
    const filter: Record<string, any> = { _id: orderId, status: 'paid' };
    if (adminId) {
      // Prevent admin from refunding their own orders (atomic, no rollback race)
      filter.userId = { $ne: new Types.ObjectId(adminId) };
    }
    const order = await this.orderModel.findOneAndUpdate(
      filter,
      { $set: refundedByUpdate },
      { new: false }, // return original doc so we have stripePaymentIntentId
    );
    if (!order) {
      const exists = await this.orderModel.findOne({ _id: orderId }).lean();
      if (!exists) throw new NotFoundException('Comanda nu a fost găsită');
      if (adminId && exists.userId.toString() === adminId)
        throw new ForbiddenException('Nu poți rambursa propriile comenzi');
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

    // Rollback coupon usage if a coupon was applied. Pass couponUsedAt so the
    // service $pulls only the exact `usages` entry for THIS order — without it,
    // $pull would match by userId alone and remove all the user's other usages
    // of the same code, breaking per-user limits.
    if (order.couponCode) {
      await this.couponsService.rollbackUsage(
        order.couponCode,
        order.userId.toString(),
        order.couponUsedAt ?? undefined,
      ).catch((err) => {
        this.logger.error(`Failed to rollback coupon usage for order ${orderId}: ${err?.message}`);
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
      undefined,
      order._id.toString(),
    );

    return (await this.orderModel.findById(orderId))!;
  }

  async createAndPayFake(userId: string, couponCode?: string) {
    const cartItems = await this.cartService.getCartItems(userId);
    if (!cartItems.length) throw new BadRequestException('Coșul este gol');

    const courses = await Promise.all(
      cartItems.map((id) => this.coursesService.findById(id.toString())),
    );

    const unpublished = courses.find((c) => !c.published);
    if (unpublished) {
      throw new BadRequestException(`Cursul "${unpublished.title}" nu mai este disponibil.`);
    }

    const items = courses.map((course) => ({
      courseId: course._id as Types.ObjectId,
      title: course.title,
      price: course.price,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.price, 0);

    let discountAmount = 0;
    let couponUsedAt: Date | null = null;
    let appliedCouponCode: string | null = null;
    if (couponCode && couponCode.trim()) {
      // Same populated-instructorId trap as createOrder — extract _id explicitly.
      const instructorSubtotals: Record<string, number> = {};
      const coursePrices: Record<string, number> = {};
      const instructorIdSet = new Set<string>();
      for (const course of courses) {
        const instId = (course.instructorId as any)?._id?.toString() ?? course.instructorId?.toString();
        if (instId) {
          instructorSubtotals[instId] = (instructorSubtotals[instId] ?? 0) + course.price;
          instructorIdSet.add(instId);
        }
        coursePrices[course._id.toString()] = course.price;
      }
      const instructorIds = Array.from(instructorIdSet);
      const result = await this.couponsService.applyCoupon(couponCode, subtotal, instructorIds, instructorSubtotals, coursePrices, userId);
      discountAmount = result.discountAmount;
      couponUsedAt = result.usedAt;
      appliedCouponCode = couponCode.trim().toUpperCase();
    }

    const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    const order = new this.orderModel({
      userId: new Types.ObjectId(userId),
      items,
      total,
      discountAmount: Math.round(discountAmount * 100) / 100,
      couponCode: appliedCouponCode,
      couponUsedAt,
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
      undefined,
      order._id.toString(),
    );

    await this.cartService.clearCart(userId);
    await this.wishlistService.removePurchasedCourses(userId, order.items.map((i) => i.courseId.toString()));

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

  // ── Cron jobs ─────────────────────────────────────────────────────────────

  /**
   * Rulează la fiecare 5 minute.
   *
   * Resetează la 'pending' ordinele blocate în 'confirming' de peste 5 minute.
   * Scenariul: serverul a căzut exact între setarea statusului 'confirming' și
   * finalizarea înrolărilor. Webhook-ul Stripe va retrimite și va putea
   * procesa din nou ordinul (care e din nou în 'pending').
   */
  /**
   * Rulează la fiecare 5 minute.
   *
   * Resetează ordinele blocate în 'confirming' de peste 10 minute înapoi la
   * 'pending' — normalul este câteva secunde; 10 minute acoperă orice spike de
   * latență al bazei de date sau al serviciului de email fără a fi prea agresiv.
   * Stripe va retrimite webhook-ul, care va finaliza înrolarea corect.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async recoverStuckConfirmingOrders() {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const result = await this.orderModel.updateMany(
      { status: 'confirming', updatedAt: { $lt: tenMinutesAgo } },
      { $set: { status: 'pending' } },
    );
    if (result.modifiedCount > 0) {
      this.logger.warn(
        `Recovered ${result.modifiedCount} stuck 'confirming' order(s) → reset to 'pending' (stuck > 10 min)`,
      );
    }
  }

  /**
   * Rulează la fiecare oră.
   *
   * Anulează ordinele în 'pending' de peste 60 de minute — userul a abandonat
   * checkout-ul fără să plătească. Anulăm și PaymentIntent-ul în Stripe pentru
   * a elibera resursele și a menține rapoartele curate.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cancelAbandonedOrders() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    // Picks up BOTH Stripe orders (PaymentIntent never paid) and free orders
    // whose enrollment failed and got demoted to 'pending'. The previous filter
    // required a Stripe PaymentIntent, so failed-enrollment free orders became
    // zombi and their coupon usage leaked forever.
    const abandoned = await this.orderModel.find({
      status: 'pending',
      createdAt: { $lt: oneHourAgo },
    }).lean();

    if (!abandoned.length) return;

    const results = await Promise.allSettled(
      abandoned.map(async (order) => {
        // Anulează PaymentIntent în Stripe doar dacă există unul (ordinele free
        // 100% reducere nu au PaymentIntent).
        if (order.stripePaymentIntentId) {
          try {
            await this.stripe.paymentIntents.cancel(order.stripePaymentIntentId);
          } catch (err: any) {
            // 'canceled' sau 'succeeded' — deja procesat, continuăm
            if (!['canceled', 'succeeded'].includes(err?.raw?.payment_intent?.status)) {
              this.logger.warn(`Could not cancel PaymentIntent ${order.stripePaymentIntentId}: ${err?.message}`);
            }
          }
        }

        // Atomic transition pending → cancelled. updateOne returnează
        // modifiedCount === 1 doar dacă ACEASTĂ apelare a făcut tranziția,
        // ceea ce previne dublul-rollback dacă cron-ul rulează de două ori
        // simultan pe același ordin.
        const update = await this.orderModel.updateOne(
          { _id: order._id, status: 'pending' },
          { $set: { status: 'cancelled' } },
        );

        // Rollback cupon doar pentru tranziția pe care AM făcut-o noi.
        if (update.modifiedCount === 1 && order.couponCode) {
          await this.couponsService.rollbackUsage(
            order.couponCode,
            order.userId.toString(),
            order.couponUsedAt ?? undefined,
          ).catch((err) => {
            this.logger.error(
              `Coupon rollback failed for abandoned order ${order._id} [${order.couponCode}]: ${err?.message}`,
            );
          });
        }
      }),
    );

    const cancelled = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    this.logger.log(`Abandoned orders: ${cancelled} cancelled, ${failed} failed`);
  }
}
