import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ default: '' })
  comment: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
ReviewSchema.index({ courseId: 1, userId: 1 }, { unique: true });
