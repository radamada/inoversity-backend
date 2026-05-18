import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

class OrderItem {
  courseId: Types.ObjectId;
  title: string;
  price: number;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: [
      {
        courseId: { type: Types.ObjectId, ref: 'Course' },
        title: String,
        price: Number,
      },
    ],
    required: true,
  })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({
    enum: ['pending', 'confirming', 'paid', 'refunded', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: String, default: null })
  stripePaymentIntentId: string | null;

  @Prop({ type: String, default: null })
  stripeClientSecret: string | null;

  @Prop({ type: String, default: null })
  couponCode: string | null;

  // Timestamp of the exact `usages` entry pushed when this order applied the coupon.
  // Required at refund time so we $pull the correct entry (without it, $pull would
  // remove ALL the user's usages of this coupon, corrupting per-user limits).
  @Prop({ type: Date, default: null })
  couponUsedAt: Date | null;

  @Prop({ type: Number, default: 0 })
  discountAmount: number;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  refundedBy: Types.ObjectId | null;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ stripePaymentIntentId: 1 }, { sparse: true });
// Cron job indexes: recoverStuckConfirmingOrders + cancelAbandonedOrders
OrderSchema.index({ status: 1, updatedAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
