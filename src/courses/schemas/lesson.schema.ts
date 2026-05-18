import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LessonDocument = Lesson & Document;

export class QuizQuestion {
  question: string;
  options: string[];         // 2–10 options
  correctIndexes: number[];  // 0-based indexes of correct options (supports multiple)
}

@Schema({ timestamps: true })
export class Lesson {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Section', required: true })
  sectionId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: String, enum: ['video', 'quiz'], default: 'video' })
  type: 'video' | 'quiz';

  @Prop({ default: '' })
  cdnVideoId: string; // Bunny.net video GUID

  @Prop({ default: 0 })
  duration: number; // seconds

  @Prop({ required: true, min: 0 })
  order: number;

  @Prop({ default: false })
  isFree: boolean; // preview gratuit

  @Prop({
    type: [
      {
        question: { type: String, required: true },
        options: { type: [String], required: true },
        correctIndexes: { type: [Number], required: true },
      },
    ],
    default: [],
  })
  questions: QuizQuestion[];
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);
LessonSchema.index({ courseId: 1, sectionId: 1, order: 1 });
