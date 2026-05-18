import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CourseDocument = Course & Document;

// `versionKey: false` keeps Mongoose from leaking `__v` into responses. The
// lookup paths in courses.service.ts use lean() and spread the result back
// to the client; without this, `__v` was silently included in API output.
// `toJSON` transform also drops `__v` defensively for any non-lean serialization.
@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform: (_doc, ret: any) => {
      delete ret.__v;
      return ret;
    },
  },
})
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

  /** Holds unpublished edits for a live course. null = no pending changes. */
  @Prop({ type: Object, default: null })
  pendingChanges: Record<string, any> | null;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
CourseSchema.index({ title: 'text', description: 'text', tags: 'text' });
// slug already unique-indexed via @Prop({ unique: true }) — no need to repeat.
// Hot paths:
//   • Public listing — filter by published, sort by createdAt
//   • Instructor "my courses" — filter by instructorId, possibly + published
//   • Category browsing — filter by categoryId + published
// Without these, Mongo does collection scans on every list request.
CourseSchema.index({ published: 1, createdAt: -1 });
CourseSchema.index({ instructorId: 1, published: 1 });
CourseSchema.index({ categoryId: 1, published: 1 });
