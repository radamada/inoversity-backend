import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NoteDocument = Note & Document;

@Schema({ timestamps: true })
export class Note {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Lesson', required: true })
  lessonId: Types.ObjectId;

  @Prop({ default: '' })
  content: string;
}

export const NoteSchema = SchemaFactory.createForClass(Note);
// Unique constraint: one note per (user, course, lesson)
NoteSchema.index({ userId: 1, courseId: 1, lessonId: 1 }, { unique: true });
// Covers getCourseNotes query: filter by (userId, courseId) + sort by updatedAt desc
NoteSchema.index({ userId: 1, courseId: 1, updatedAt: -1 });
