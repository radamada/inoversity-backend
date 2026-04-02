import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require('qrcode');
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
    try {
      const saved = await enrollment.save();
      await this.courseModel.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });
      return saved;
    } catch (err: any) {
      if (err?.code === 11000) {
        // Duplicate key — race condition, enrollment already exists
        const existing = await this.enrollmentModel.findOne({
          userId: new Types.ObjectId(userId),
          courseId: new Types.ObjectId(courseId),
        });
        if (existing) return existing;
        throw new ConflictException('Utilizatorul este deja înscris la acest curs');
      }
      throw err;
    }
  }

  // ── Owner / Admin bypass ───────────────────────────────────────────────────

  /** Returns true if the user is the instructor of this course */
  private async isCourseOwner(userId: string, courseId: string): Promise<boolean> {
    const course = await this.courseModel
      .findById(courseId)
      .select('instructorId')
      .lean();
    return !!course && course.instructorId.toString() === userId;
  }

  /**
   * Auto-creates an enrollment for a course owner/admin (no orderId).
   * Idempotent — safe to call multiple times.
   */
  private async autoEnroll(userId: string, courseId: string): Promise<EnrollmentDocument> {
    const existing = await this.enrollmentModel.findOne({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
    });
    if (existing) return existing;

    try {
      const enrollment = new this.enrollmentModel({
        userId: new Types.ObjectId(userId),
        courseId: new Types.ObjectId(courseId),
        orderId: null,
      });
      return await enrollment.save();
    } catch (err: any) {
      if (err?.code === 11000) {
        const found = await this.enrollmentModel.findOne({
          userId: new Types.ObjectId(userId),
          courseId: new Types.ObjectId(courseId),
        });
        if (found) return found;
      }
      throw err;
    }
  }

  // ── isEnrolled ────────────────────────────────────────────────────────────

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const count = await this.enrollmentModel.countDocuments({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
      status: 'active',
    });
    if (count > 0) return true;
    return this.isCourseOwner(userId, courseId);
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
    // Auto-create enrollments for courses this user owns (instructor/admin)
    const ownedCourses = await this.courseModel
      .find({ instructorId: new Types.ObjectId(userId), published: true })
      .select('_id')
      .lean();

    if (ownedCourses.length > 0) {
      const existingEnrollments = await this.enrollmentModel
        .find({ userId: new Types.ObjectId(userId) })
        .select('courseId')
        .lean();
      const enrolledIds = new Set(existingEnrollments.map((e) => e.courseId.toString()));

      await Promise.all(
        ownedCourses
          .filter((c) => !enrolledIds.has(c._id.toString()))
          .map((c) => this.autoEnroll(userId, c._id.toString())),
      );
    }

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
    let enrollment: EnrollmentDocument | null = await this.enrollmentModel.findOne({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
    });
    if (!enrollment) {
      if (await this.isCourseOwner(userId, courseId)) {
        enrollment = await this.autoEnroll(userId, courseId);
      } else {
        throw new NotFoundException('Nu ești înscris la acest curs');
      }
    }
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
    let enrollment: EnrollmentDocument | null = await this.enrollmentModel.findOne({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
    });
    if (!enrollment) {
      if (await this.isCourseOwner(userId, courseId)) {
        enrollment = await this.autoEnroll(userId, courseId);
      } else {
        throw new NotFoundException('Nu ești înscris la acest curs');
      }
    }
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

    const verifyUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/verify-certificate/${enrollment._id.toString()}`;
    const qrDataUrl: string = await QRCode.toDataURL(verifyUrl, { width: 100, margin: 1 });
    // Convert data URL to buffer
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    const fontsDir = join(__dirname, '..', 'assets', 'fonts');
    const fontRegular = join(fontsDir, 'Roboto-Regular.ttf');
    const fontBold    = join(fontsDir, 'Roboto-Bold.ttf');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 60 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Register fonts cu suport Unicode/diacritice
      doc.registerFont('Regular', fontRegular);
      doc.registerFont('Bold', fontBold);

      // Background
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8f7ff');

      // Border
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .lineWidth(3).stroke('#4f46e5');
      doc.rect(28, 28, doc.page.width - 56, doc.page.height - 56)
        .lineWidth(1).stroke('#818cf8');

      // Title
      doc.fillColor('#4f46e5').fontSize(14).font('Regular')
        .text('EduInovatrium', 0, 70, { align: 'center' });

      doc.fillColor('#1e1b4b').fontSize(36).font('Bold')
        .text('CERTIFICAT DE ABSOLVIRE', 0, 110, { align: 'center' });

      // Divider
      doc.moveTo(180, 165).lineTo(doc.page.width - 180, 165)
        .lineWidth(1).stroke('#c7d2fe');

      // Body
      doc.fillColor('#6b7280').fontSize(14).font('Regular')
        .text('Aceasta certifică faptul că', 0, 185, { align: 'center' });

      doc.fillColor('#111827').fontSize(28).font('Bold')
        .text(studentName, 0, 215, { align: 'center' });

      doc.fillColor('#6b7280').fontSize(14).font('Regular')
        .text('a finalizat cu succes cursul', 0, 260, { align: 'center' });

      doc.fillColor('#4f46e5').fontSize(20).font('Bold')
        .text(`"${courseTitle}"`, 0, 288, { align: 'center' });

      doc.fillColor('#9ca3af').fontSize(12).font('Regular')
        .text(`Data finalizării: ${completedDate}`, 0, 340, { align: 'center' });

      // QR Code (bottom right)
      doc.image(qrBuffer, doc.page.width - 140, doc.page.height - 140, { width: 90 });
      doc.fillColor('#9ca3af').fontSize(8).font('Regular')
        .text('Verifică autenticitatea', doc.page.width - 150, doc.page.height - 48, { width: 110, align: 'center' });

      doc.end();
    });
  }

  async verifyCertificate(enrollmentId: string): Promise<object> {
    const enrollment = await this.enrollmentModel
      .findOne({ _id: new Types.ObjectId(enrollmentId), status: 'active' })
      .populate<{ courseId: { title: string; slug: string } }>('courseId', 'title slug')
      .populate<{ userId: { name: string } }>('userId', 'name')
      .exec();

    if (!enrollment || !enrollment.completedAt) {
      throw new NotFoundException('Certificatul nu a putut fi verificat');
    }

    return {
      valid: true,
      studentName: (enrollment.userId as any).name,
      courseTitle: (enrollment.courseId as any).title,
      courseSlug: (enrollment.courseId as any).slug,
      completedAt: enrollment.completedAt,
    };
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
