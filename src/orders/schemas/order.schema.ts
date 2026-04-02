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
    enum: ['pending', 'paid', 'refunded', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: String, default: null })
  stripePaymentIntentId: string | null;

  @Prop({ type: String, default: null })
  stripeClientSecret: string | null;

  @Prop({ type: String, default: null })
  couponCode: string | null;

  @Prop({ type: Number, default: 0 })
  discountAmount: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ stripePaymentIntentId: 1 }, { sparse: true });
