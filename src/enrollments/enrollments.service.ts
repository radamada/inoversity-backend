import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Enrollment, EnrollmentDocument } from './schemas/enrollment.schema';
import { Lesson, LessonDocument } from '../courses/schemas/lesson.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
  ) {}

  async enroll(userId: string, courseId: string, orderId: string): Promise<EnrollmentDocument> {
    const existing = await this.enrollmentModel.findOne({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
    });
    if (existing) {
      if (existing.status === 'refunded') {
        existing.status = 'active';
        existing.orderId = new Types.ObjectId(orderId);
        await existing.save();
        await this.courseModel.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });
      }
      return existing;
    }

    const enrollment = new this.enrollmentModel({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
      orderId: new Types.ObjectId(orderId),
    });
    const saved = await enrollment.save();
    await this.courseModel.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });
    return saved;
  }

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const count = await this.enrollmentModel.countDocuments({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
      status: 'active',
    });
    return count > 0;
  }

  async revokeEnrollments(userId: string, courseIds: string[]): Promise<void> {
    await this.enrollmentModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        courseId: { $in: courseIds.map((id) => new Types.ObjectId(id)) },
        status: 'active',
      },
      { $set: { status: 'refunded' } },
    );
    await this.courseModel.updateMany(
      { _id: { $in: courseIds.map((id) => new Types.ObjectId(id)) }, enrollmentCount: { $gt: 0 } },
      { $inc: { enrollmentCount: -1 } },
    );
  }

  async getMyEnrollments(userId: string) {
    return this.enrollmentModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'courseId',
        select: 'title slug thumbnail instructorId rating',
        populate: { path: 'instructorId', select: 'name avatar' },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getProgress(userId: string, courseId: string) {
    const enrollment = await this.enrollmentModel.findOne({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
    });
    if (!enrollment) throw new NotFoundException('Nu ești înscris la acest curs');
    if (enrollment.status === 'refunded') throw new ForbiddenException('Accesul la acest curs a fost revocat');

    // Retroactive completion check — handles enrollments completed before completedAt logic existed
    if (!enrollment.completedAt && enrollment.completedLessons.length > 0) {
      const totalLessons = await this.lessonModel.countDocuments({
        courseId: new Types.ObjectId(courseId),
      });
      if (totalLessons > 0 && enrollment.completedLessons.length >= totalLessons) {
        enrollment.completedAt = new Date();
        await enrollment.save();
      }
    }

    return enrollment;
  }

  async markLessonComplete(userId: string, courseId: string, lessonId: string) {
    const enrollment = await this.enrollmentModel.findOne({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
    });
    if (!enrollment) throw new NotFoundException('Nu ești înscris la acest curs');
    if (enrollment.status === 'refunded') throw new ForbiddenException('Accesul la acest curs a fost revocat');

    const lessonOid = new Types.ObjectId(lessonId);
    const alreadyDone = enrollment.completedLessons.some(
      (id) => id.toString() === lessonId,
    );
    if (!alreadyDone) {
      enrollment.completedLessons.push(lessonOid);
    }
    enrollment.lastAccessedAt = new Date();

    if (!enrollment.completedAt) {
      const totalLessons = await this.lessonModel.countDocuments({
        courseId: new Types.ObjectId(courseId),
      });
      if (totalLessons > 0 && enrollment.completedLessons.length >= totalLessons) {
        enrollment.completedAt = new Date();
      }
    }

    return enrollment.save();
  }

  async countByCourse(courseId: string): Promise<number> {
    return this.enrollmentModel.countDocuments({ courseId: new Types.ObjectId(courseId) });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [enrollments, total] = await Promise.all([
      this.enrollmentModel
        .find()
        .populate('userId', 'name email')
        .populate('courseId', 'title')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.enrollmentModel.countDocuments(),
    ]);
    return { enrollments, total, page, pages: Math.ceil(total / limit) };
  }
}
