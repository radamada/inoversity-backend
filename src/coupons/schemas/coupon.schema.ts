import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CouponDocument = Coupon & Document;

export type DiscountType = 'percent' | 'fixed';

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, enum: ['percent', 'fixed'] })
  discountType: DiscountType;

  @Prop({ required: true, min: 0 })
  discountValue: number;

  @Prop({ type: Number, default: null })
  maxUses: number | null;

  @Prop({ default: 0, min: 0 })
  usedCount: number;

  @Prop({ type: Date, default: null })
  expiresAt: Date | null;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0, min: 0 })
  minOrderAmount: number;

  /**
   * If set, this coupon was created by an instructor and applies only to orders
   * that contain at least one course from that instructor.
   * Null = admin coupon, applies globally.
   */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  instructorId: Types.ObjectId | null;

  /**
   * If set, this coupon applies only to this specific course.
   * Takes priority over instructorId scoping — discount is applied only to this course's price.
   */
  @Prop({ type: Types.ObjectId, ref: 'Course', default: null })
  courseId: Types.ObjectId | null;

  /** Maximum times a single user can use this coupon. null = no per-user limit. */
  @Prop({ type: Number, default: null })
  maxUsesPerUser: number | null;

  /** Track which users have used this coupon and how many times. */
  @Prop({
    type: [{ userId: { type: Types.ObjectId, ref: 'User' }, usedAt: Date }],
    default: [],
  })
  usages: { userId: Types.ObjectId; usedAt: Date }[];

  /**
   * Soft-delete marker. When set, the coupon is hidden from listings and rejected
   * by validate/apply, but the document survives so that historical orders that
   * reference `couponCode` can still be audited (which discount/scope it had).
   */
  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
// Index on `code` is already created by `unique: true` in @Prop above — no duplicate needed.
// Index for filtering active (non-deleted) coupons in admin/instructor listings.
CouponSchema.index({ deletedAt: 1 });
