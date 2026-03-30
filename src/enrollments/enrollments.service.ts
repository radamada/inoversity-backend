import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
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

  async generateCertificate(userId: string, courseId: string): Promise<Buffer> {
    const enrollment = await this.enrollmentModel
      .findOne({ userId: new Types.ObjectId(userId), courseId: new Types.ObjectId(courseId), status: 'active' })
      .populate<{ courseId: { title: string } }>('courseId', 'title')
      .populate<{ userId: { name: string } }>('userId', 'name')
      .exec();

    if (!enrollment) throw new NotFoundException('Nu ești înscris la acest curs');
    if (!enrollment.completedAt) throw new BadRequestException('Cursul nu a fost finalizat încă');

    const studentName = (enrollment.userId as any).name as string;
    const courseTitle = (enrollment.courseId as any).title as string;
    const completedDate = enrollment.completedAt.toLocaleDateString('ro-RO', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 60 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Background
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8f7ff');

      // Border
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .lineWidth(3).stroke('#4f46e5');
      doc.rect(28, 28, doc.page.width - 56, doc.page.height - 56)
        .lineWidth(1).stroke('#818cf8');

      // Title
      doc.fillColor('#4f46e5').fontSize(14).font('Helvetica')
        .text('EduInovatrium', 0, 70, { align: 'center' });

      doc.fillColor('#1e1b4b').fontSize(36).font('Helvetica-Bold')
        .text('CERTIFICAT DE ABSOLVIRE', 0, 110, { align: 'center' });

      // Divider
      doc.moveTo(180, 165).lineTo(doc.page.width - 180, 165)
        .lineWidth(1).stroke('#c7d2fe');

      // Body
      doc.fillColor('#6b7280').fontSize(14).font('Helvetica')
        .text('Aceasta certifică faptul că', 0, 185, { align: 'center' });

      doc.fillColor('#111827').fontSize(28).font('Helvetica-Bold')
        .text(studentName, 0, 215, { align: 'center' });

      doc.fillColor('#6b7280').fontSize(14).font('Helvetica')
        .text('a finalizat cu succes cursul', 0, 260, { align: 'center' });

      doc.fillColor('#4f46e5').fontSize(20).font('Helvetica-Bold')
        .text(`"${courseTitle}"`, 0, 288, { align: 'center' });

      doc.fillColor('#9ca3af').fontSize(12).font('Helvetica')
        .text(`Data finalizării: ${completedDate}`, 0, 340, { align: 'center' });

      doc.end();
    });
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
