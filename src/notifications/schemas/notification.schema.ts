import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export type NotificationType = 'purchase' | 'refund' | 'course_updated' | 'wishlist_removed' | 'course_deleted' | 'course_retracted' | 'course_republished';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  read: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Course', default: null })
  courseId: Types.ObjectId | null;

  // Idempotency key for order-related notifications (purchase, refund).
  // Combined with the partial unique index below, prevents duplicate notifications
  // when an order flow is re-entered (e.g., Stripe webhook retry, double-submit).
  @Prop({ type: Types.ObjectId, ref: 'Order', default: null })
  orderId: Types.ObjectId | null;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
// Idempotency: only one notification per (user, type, order). Partial so older
// non-order notifications (e.g., wishlist_removed) are not constrained.
NotificationSchema.index(
  { userId: 1, type: 1, orderId: 1 },
  { unique: true, partialFilterExpression: { orderId: { $type: 'objectId' } } },
);
