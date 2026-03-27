import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LessonDocument = Lesson & Document;

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

  @Prop({ default: '' })
  cdnVideoId: string; // Bunny.net video GUID

  @Prop({ default: 0 })
  duration: number; // seconds

  @Prop({ required: true, min: 0 })
  order: number;

  @Prop({ default: false })
  isFree: boolean; // preview gratuit
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);
LessonSchema.index({ courseId: 1, sectionId: 1, order: 1 });
