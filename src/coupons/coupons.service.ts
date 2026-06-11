import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IsEnum, IsOptional, IsBoolean, IsNumber, IsString, Min, Max, IsDate } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Coupon, CouponDocument } from './schemas/coupon.schema';
import type { DiscountType } from './schemas/coupon.schema';
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

export class CreateCouponDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsBoolean()
  random?: boolean;

  @IsEnum(['percent', 'fixed'])
  discountType: DiscountType;

  @IsNumber()
  @Min(0)
  @Max(100000)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsesPerUser?: number | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsString()
  courseId?: string | null;
}

// Tip real pentru update (nu `Partial<CreateCouponDto>`, care s-ar șterge în
// Object la runtime și ar dezactiva ValidationPipe). Service-ul tot strip-uiește
// câmpurile server-controlled (code/usedCount/usages/instructorId) ca apărare în
// adâncime, dar DTO-ul real respinge orice câmp necunoscut din start.
export class UpdateCouponDto extends PartialType(CreateCouponDto) {}

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
  ) {}

  // ── Public: validate (preview only, no side-effects) ───────────────────────

  async validate(code: string, orderTotal: number): Promise<CouponValidationResult> {
    const normalizedCode = code.trim().toUpperCase();
    const coupon = await this.couponModel
      .findOne({ code: normalizedCode, deletedAt: null })
      .lean();

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
  ): Promise<{ discountAmount: number; usedAt: Date | null }> {
    const normalizedCode = code.trim().toUpperCase();
    const now = new Date();
    const userObjId = userId ? new Types.ObjectId(userId) : null;

    // Atomic guard: filter enforces maxUses AND maxUsesPerUser in the same single-doc
    // update, so concurrent requests cannot all pass a post-hoc check. Without the
    // per-user limit in the filter, parallel requests would each succeed → over-use.
    const filter: Record<string, any> = {
      code: normalizedCode,
      isActive: true,
      deletedAt: null,
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
      ],
    };
    if (userObjId) {
      filter.$and.push({
        $or: [
          { maxUsesPerUser: null },
          {
            $expr: {
              $lt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ['$usages', []] },
                      as: 'u',
                      cond: { $eq: ['$$u.userId', userObjId] },
                    },
                  },
                },
                '$maxUsesPerUser',
              ],
            },
          },
        ],
      });
    }

    const coupon = await this.couponModel.findOneAndUpdate(
      filter,
      {
        $inc: { usedCount: 1 },
        ...(userObjId ? { $push: { usages: { userId: userObjId, usedAt: now } } } : {}),
      },
      { new: true },
    ).lean();

    if (!coupon) {
      // Filter failed: either coupon invalid/expired, global cap hit, or per-user cap hit.
      // Distinguish per-user cap with a follow-up read so the message is accurate.
      if (userObjId) {
        const existing = await this.couponModel.findOne({ code: normalizedCode }).lean();
        if (
          existing?.isActive &&
          existing.maxUsesPerUser !== null &&
          existing.maxUsesPerUser !== undefined
        ) {
          const userUsageCount = (existing.usages ?? []).filter(
            (u) => u.userId.toString() === userId,
          ).length;
          if (userUsageCount >= existing.maxUsesPerUser) {
            throw new BadRequestException('Ai atins limita de utilizări pentru acest cod');
          }
        }
      }
      throw new BadRequestException('Codul de reducere nu este valid sau a expirat');
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

    // Baza pe care se aplică reducerea, în funcție de scope: cursul vizat,
    // subtotalul instructorului, sau tot coșul. minOrderAmount trebuie verificat
    // pe ACEEAȘI bază — altfel pragul se satisface umplând coșul cu cursuri
    // nelegate, deși reducerea cade pe subtotalul scope-uit (mult mai mic).
    const scopedBase = coupon.courseId
      ? (coursePrices[coupon.courseId.toString()] ?? 0)
      : coupon.instructorId
        ? (instructorSubtotals[coupon.instructorId.toString()] ?? orderTotal)
        : orderTotal;

    if (coupon.minOrderAmount > 0 && scopedBase < coupon.minOrderAmount) {
      await this.couponModel.updateOne({ code: normalizedCode }, { $inc: { usedCount: -1 } });
      throw new BadRequestException(
        `Suma minimă pentru acest cod este ${coupon.minOrderAmount.toFixed(2)} lei`,
      );
    }

    return {
      discountAmount: this.calculateDiscount(coupon.discountType, coupon.discountValue, scopedBase),
      usedAt: userId ? now : null,
    };
  }

  // ── Internal: rollback a coupon usage if order creation failed ────────────

  async rollbackUsage(code: string, userId?: string, usedAt?: Date): Promise<void> {
    const update: Record<string, any> = { $inc: { usedCount: -1 } };
    if (userId) {
      // Pull the exact entry by userId + timestamp — avoids removing other users' entries
      // ($pop: 1 was wrong: it removes the last element regardless of which user pushed it)
      const pullFilter: Record<string, any> = { userId: new Types.ObjectId(userId) };
      if (usedAt) pullFilter.usedAt = usedAt;
      update.$pull = { usages: pullFilter };
    }
    await this.couponModel.updateOne(
      { code: code.trim().toUpperCase() },
      update,
    );
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

  async findAll(limit = 200): Promise<CouponDocument[]> {
    return this.couponModel
      .find({ deletedAt: null })
      .populate('instructorId', 'name email role')
      .populate('courseId', 'title slug')
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 500))
      .exec();
  }

  async update(id: string, dto: Partial<CreateCouponDto>): Promise<CouponDocument> {
    const existing = await this.couponModel.findById(id).select('usedCount').lean();
    if (!existing) throw new NotFoundException('Cuponul nu a fost găsit');

    const $set: Record<string, unknown> = { ...dto };

    // Strip fields that must NEVER be writable through the update API:
    //   - random: not a DB field; if true would re-trigger code generation
    //   - code: immutable for the life of the coupon (changing it breaks any
    //     in-flight redemptions and corrupts audit trails on past orders)
    //   - usedCount, usages, instructorId: server-controlled, no reason a client
    //     should ever set them. (whitelist:true at the global pipe normally
    //     strips unknowns, but `Partial<CreateCouponDto>` doesn't enumerate
    //     these so they could slip through.)
    delete $set.random;
    delete $set.code;
    delete (dto as any).usedCount;
    delete (dto as any).usages;
    delete (dto as any).instructorId;
    delete ($set as any).usedCount;
    delete ($set as any).usages;
    delete ($set as any).instructorId;

    // Once a coupon has been redeemed at least once, freezing the discount
    // shape prevents retroactive rewriting of what users were promised.
    if (existing.usedCount > 0) {
      if ('discountType' in $set || 'discountValue' in $set) {
        throw new BadRequestException(
          'Nu poți modifica tipul sau valoarea reducerii după ce cuponul a fost folosit. Creează un cupon nou.',
        );
      }
      if ('courseId' in $set) {
        throw new BadRequestException(
          'Nu poți schimba cursul restricționat după ce cuponul a fost folosit.',
        );
      }
    }

    const coupon = await this.couponModel
      .findByIdAndUpdate(id, { $set }, { new: true })
      .exec();
    if (!coupon) throw new NotFoundException('Cuponul nu a fost găsit');
    return coupon;
  }

  async remove(id: string): Promise<void> {
    const coupon = await this.couponModel.findById(id).select('usedCount').lean();
    if (!coupon) throw new NotFoundException('Cuponul nu a fost găsit');

    if (coupon.usedCount > 0) {
      // Soft-delete: păstrăm documentul pentru audit-ul ordinelor istorice care
      // referențiază couponCode. Setăm deletedAt → ascuns din liste & rejected
      // de validate/apply.
      await this.couponModel.updateOne({ _id: id }, { $set: { deletedAt: new Date(), isActive: false } });
    } else {
      // Cupon nefolosit — hard-delete e safe, eliberează codul pentru reutilizare.
      await this.couponModel.findByIdAndDelete(id);
    }
  }

  // ── Instructor: manage own coupons ─────────────────────────────────────────

  async createForInstructor(dto: CreateCouponDto, instructorId: string): Promise<CouponDocument> {
    return this.create(dto, instructorId);
  }

  async findByInstructor(instructorId: string): Promise<CouponDocument[]> {
    return this.couponModel
      .find({ instructorId: new Types.ObjectId(instructorId), deletedAt: null })
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
    if (!coupon || coupon.deletedAt) throw new NotFoundException('Cuponul nu a fost găsit');
    if (!isAdmin && coupon.instructorId?.toString() !== instructorId) {
      throw new ForbiddenException('Nu ai permisiunea să modifici acest cupon');
    }
    return this.update(id, dto);
  }

  async removeForInstructor(id: string, instructorId: string, isAdmin: boolean): Promise<void> {
    const coupon = await this.couponModel.findById(id).lean();
    if (!coupon || coupon.deletedAt) throw new NotFoundException('Cuponul nu a fost găsit');
    if (!isAdmin && coupon.instructorId?.toString() !== instructorId) {
      throw new ForbiddenException('Nu ai permisiunea să ștergi acest cupon');
    }
    // Delegate to .remove() so soft-vs-hard delete logic stays in one place.
    await this.remove(id);
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
