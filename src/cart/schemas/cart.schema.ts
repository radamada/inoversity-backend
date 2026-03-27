import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CartDocument = Cart & Document;

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Course' }], default: [] })
  items: Types.ObjectId[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
