import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EnrollmentDocument = Enrollment & Document;

@Schema({ timestamps: true })
export class Enrollment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: false, default: null })
  orderId: Types.ObjectId | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Lesson' }], default: [] })
  completedLessons: Types.ObjectId[];

  @Prop({
    type: [
      {
        quizId: { type: Types.ObjectId, ref: 'Lesson', required: true },
        score: { type: Number, required: true },
        passed: { type: Boolean, required: true },
        attemptedAt: { type: Date, required: true },
      },
    ],
    default: [],
  })
  quizAttempts: {
    quizId: Types.ObjectId;
    score: number;
    passed: boolean;
    attemptedAt: Date;
  }[];

  @Prop({ type: Date, default: null })
  lastAccessedAt: Date | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: String, enum: ['active', 'refunded'], default: 'active' })
  status: 'active' | 'refunded';

  /** UUID used for certificate verification URL — not guessable like ObjectId */
  @Prop({ type: String, default: null })
  verificationCode: string | null;

  /**
   * Snapshot of the student's name at the moment the certificate was first
   * issued. Without this, a later profile-name change would silently rewrite
   * the name on every re-download of the same certificate, breaking any
   * authenticity guarantee for already-distributed PDFs.
   */
  @Prop({ type: String, default: null })
  certificateName: string | null;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);
EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
EnrollmentSchema.index({ status: 1, orderId: 1 });
// Admin dashboards / reports filter by status alone (e.g. all refunded).
EnrollmentSchema.index({ status: 1 });
// "Continue learning" lists for a user — sort by most recent access.
EnrollmentSchema.index({ userId: 1, lastAccessedAt: -1 });
EnrollmentSchema.index({ verificationCode: 1 }, { sparse: true });
