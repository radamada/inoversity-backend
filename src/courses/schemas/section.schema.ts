import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SectionDocument = Section & Document;

@Schema({ timestamps: true })
export class Section {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, min: 0 })
  order: number;
}

export const SectionSchema = SchemaFactory.createForClass(Section);
SectionSchema.index({ courseId: 1, order: 1 });
