import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';

@Injectable()
export class NotesService {
  constructor(@InjectModel(Note.name) private noteModel: Model<NoteDocument>) {}

  async getNote(userId: string, courseId: string, lessonId: string): Promise<NoteDocument | null> {
    return this.noteModel.findOne({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
      lessonId: new Types.ObjectId(lessonId),
    }).exec();
  }

  async upsertNote(userId: string, courseId: string, lessonId: string, content: string): Promise<NoteDocument> {
    return this.noteModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        courseId: new Types.ObjectId(courseId),
        lessonId: new Types.ObjectId(lessonId),
      },
      { content },
      { upsert: true, new: true },
    );
  }

  async getCourseNotes(userId: string, courseId: string): Promise<NoteDocument[]> {
    return this.noteModel.find({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
      content: { $ne: '' },
    }).sort({ updatedAt: -1 }).exec();
  }
}
