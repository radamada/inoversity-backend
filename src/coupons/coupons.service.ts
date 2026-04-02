import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Coupon, CouponDocument, DiscountType } from './schemas/coupon.schema';
import { randomBytes } from 'crypto';

export interface CouponValidationResult {
  valid: boolean;
  discountAmount: number;
  finalTotal: number;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  instructorId: string | null;
  courseId: string | null;
  maxUsesPerUser: number | null;
}

export interface CreateCouponDto {
  code?: string;
  random?: boolean;
  discountType: DiscountType;
  discountValue: number;
  maxUses?: number | null;
  maxUsesPerUser?: number | null;
  expiresAt?: Date | null;
  isActive?: boolean;
  minOrderAmount?: number;
  courseId?: string | null;
}

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
  ) {}

  // ── Public: validate (preview only, no side-effects) ───────────────────────

  async validate(code: string, orderTotal: number): Promise<CouponValidationResult> {
    const normalizedCode = code.trim().toUpperCase();
    const coupon = await this.couponModel.findOne({ code: normalizedCode }).lean();

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Codul de reducere nu este valid sau a expirat');
    }
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      throw new BadRequestException('Codul de reducere a expirat');
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Codul de reducere a atins limita de utilizări');
    }
    if (coupon.minOrderAmount > 0 && orderTotal < coupon.minOrderAmount) {
      throw new BadRequestException(
        `Suma minimă pentru acest cod este ${coupon.minOrderAmount.toFixed(2)} lei`,
      );
    }

    const discountAmount = this.calculateDiscount(coupon.discountType, coupon.discountValue, orderTotal);
    const finalTotal = Math.max(0, orderTotal - discountAmount);

    return {
      valid: true,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalTotal: Math.round(finalTotal * 100) / 100,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      instructorId: coupon.instructorId ? coupon.instructorId.toString() : null,
      courseId: coupon.courseId ? coupon.courseId.toString() : null,
      maxUsesPerUser: coupon.maxUsesPerUser ?? null,
    };
  }

  // ── Internal: apply coupon atomically during order creation ────────────────

  /**
   * Validates coupon and atomically increments usedCount.
   * @param instructorIds - instructor IDs of courses in the cart, used to
   *   validate instructor-scoped coupons.
   */
  async applyCoupon(
    code: string,
    orderTotal: number,
    instructorIds: string[] = [],
    instructorSubtotals: Record<string, number> = {},
    coursePrices: Record<string, number> = {},
    userId?: string,
  ): Promise<number> {
    const normalizedCode = code.trim().toUpperCase();
    const now = new Date();

    const coupon = await this.couponModel.findOneAndUpdate(
      {
        code: normalizedCode,
        isActive: true,
        $and: [
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
          { $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
        ],
      },
      {
        $inc: { usedCount: 1 },
        ...(userId ? { $push: { usages: { userId: new Types.ObjectId(userId), usedAt: now } } } : {}),
      },
      { new: false },
    ).lean();

    if (!coupon) {
      throw new BadRequestException('Codul de reducere nu este valid sau a expirat');
    }

    // Per-user limit check (after atomic increment so we need to roll back if violated)
    if (userId && coupon.maxUsesPerUser !== null && coupon.maxUsesPerUser !== undefined) {
      const userUsageCount = (coupon.usages ?? []).filter(
        (u) => u.userId.toString() === userId,
      ).length;
      if (userUsageCount >= coupon.maxUsesPerUser) {
        await this.couponModel.updateOne(
          { code: normalizedCode },
          {
            $inc: { usedCount: -1 },
            $pop: { usages: 1 }, // remove last pushed element
          },
        );
        throw new BadRequestException('Ai atins limita de utilizări pentru acest cod');
      }
    }

    // Course-scoped coupon: must have that specific course in cart
    if (coupon.courseId) {
      const courseIdStr = coupon.courseId.toString();
      if (!(courseIdStr in coursePrices)) {
        await this.couponModel.updateOne({ code: normalizedCode }, { $inc: { usedCount: -1 } });
        throw new BadRequestException(
          'Codul de reducere nu este valabil pentru cursurile din coșul tău',
        );
      }
    }

    // Instructor-scoped coupon: must have at least one course by that instructor
    if (!coupon.courseId && coupon.instructorId) {
      const instructorIdStr = coupon.instructorId.toString();
      if (!instructorIds.includes(instructorIdStr)) {
        await this.couponModel.updateOne({ code: normalizedCode }, { $inc: { usedCount: -1 } });
        throw new BadRequestException(
          'Codul de reducere nu este valabil pentru cursurile din coșul tău',
        );
      }
    }

    if (coupon.minOrderAmount > 0 && orderTotal < coupon.minOrderAmount) {
      await this.couponModel.updateOne({ code: normalizedCode }, { $inc: { usedCount: -1 } });
      throw new BadRequestException(
        `Suma minimă pentru acest cod este ${coupon.minOrderAmount.toFixed(2)} lei`,
      );
    }

    // Course-scoped: reduce doar prețul cursului respectiv
    if (coupon.courseId) {
      const coursePrice = coursePrices[coupon.courseId.toString()] ?? 0;
      return this.calculateDiscount(coupon.discountType, coupon.discountValue, coursePrice);
    }

    // Instructor-scoped: reduce doar subtotalul instructorului
    const relevantTotal = coupon.instructorId
      ? (instructorSubtotals[coupon.instructorId.toString()] ?? orderTotal)
      : orderTotal;

    return this.calculateDiscount(coupon.discountType, coupon.discountValue, relevantTotal);
  }

  // ── Admin: full CRUD over all coupons ──────────────────────────────────────

  async create(dto: CreateCouponDto, instructorId?: string): Promise<CouponDocument> {
    const code = dto.random || !dto.code?.trim()
      ? await this.generateUniqueCode()
      : dto.code.trim().toUpperCase();

    try {
      const coupon = new this.couponModel({
        code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxUses: dto.maxUses ?? null,
        maxUsesPerUser: dto.maxUsesPerUser ?? null,
        expiresAt: dto.expiresAt ?? null,
        isActive: dto.isActive ?? true,
        minOrderAmount: dto.minOrderAmount ?? 0,
        instructorId: instructorId ? new Types.ObjectId(instructorId) : null,
        courseId: dto.courseId ? new Types.ObjectId(dto.courseId) : null,
      });
      return await coupon.save();
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException('Există deja un cupon cu acest cod');
      }
      throw err;
    }
  }

  async findAll(): Promise<CouponDocument[]> {
    return this.couponModel
      .find()
      .populate('instructorId', 'name email role')
      .populate('courseId', 'title slug')
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(id: string, dto: Partial<CreateCouponDto>): Promise<CouponDocument> {
    const $set: Record<string, unknown> = { ...dto };
    delete $set.random; // not a DB field
    if ($set.code) $set.code = ($set.code as string).trim().toUpperCase();
    const coupon = await this.couponModel
      .findByIdAndUpdate(id, { $set }, { new: true })
      .exec();
    if (!coupon) throw new NotFoundException('Cuponul nu a fost găsit');
    return coupon;
  }

  async remove(id: string): Promise<void> {
    const result = await this.couponModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Cuponul nu a fost găsit');
  }

  // ── Instructor: manage own coupons ─────────────────────────────────────────

  async createForInstructor(dto: CreateCouponDto, instructorId: string): Promise<CouponDocument> {
    return this.create(dto, instructorId);
  }

  async findByInstructor(instructorId: string): Promise<CouponDocument[]> {
    return this.couponModel
      .find({ instructorId: new Types.ObjectId(instructorId) })
      .populate('courseId', 'title slug')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateForInstructor(
    id: string,
    dto: Partial<CreateCouponDto>,
    instructorId: string,
    isAdmin: boolean,
  ): Promise<CouponDocument> {
    const coupon = await this.couponModel.findById(id).lean();
    if (!coupon) throw new NotFoundException('Cuponul nu a fost găsit');
    if (!isAdmin && coupon.instructorId?.toString() !== instructorId) {
      throw new ForbiddenException('Nu ai permisiunea să modifici acest cupon');
    }
    return this.update(id, dto);
  }

  async removeForInstructor(id: string, instructorId: string, isAdmin: boolean): Promise<void> {
    const coupon = await this.couponModel.findById(id).lean();
    if (!coupon) throw new NotFoundException('Cuponul nu a fost găsit');
    if (!isAdmin && coupon.instructorId?.toString() !== instructorId) {
      throw new ForbiddenException('Nu ai permisiunea să ștergi acest cupon');
    }
    await this.couponModel.findByIdAndDelete(id);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private calculateDiscount(type: DiscountType, value: number, orderTotal: number): number {
    if (type === 'percent') {
      const clampedPercent = Math.min(100, Math.max(0, value));
      return (orderTotal * clampedPercent) / 100;
    }
    return Math.min(value, orderTotal);
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempts = 0; attempts < 10; attempts++) {
      const code = randomBytes(5).toString('hex').toUpperCase(); // 10-char hex
      const exists = await this.couponModel.exists({ code });
      if (!exists) return code;
    }
    throw new Error('Nu s-a putut genera un cod unic');
  }
}
