import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CourseDocument = Course & Document;

@Schema({ timestamps: true })
export class Course {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: '' })
  thumbnail: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  instructorId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null })
  categoryId: Types.ObjectId | null;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  published: boolean;

  @Prop({ default: 0, min: 0, max: 5 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ default: 0 })
  enrollmentCount: number;

  @Prop({ type: [String], default: [] })
  whatYouLearn: string[];

  @Prop({ type: [String], default: [] })
  requirements: string[];

  @Prop({ default: '' })
  level: string; // beginner | intermediate | advanced

  @Prop({ default: 'ro' })
  language: string;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
CourseSchema.index({ title: 'text', description: 'text', tags: 'text' });
