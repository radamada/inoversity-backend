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
      // autoFirstPage: false ca să nu creeze pagini extra automat
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, autoFirstPage: false });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.addPage();

      doc.registerFont('Regular', fontRegular);
      doc.registerFont('Bold', fontBold);

      const W = doc.page.width;   // 841.89
      const H = doc.page.height;  // 595.28

      // ── Fundal alb cald ──────────────────────────────────────────
      doc.rect(0, 0, W, H).fill('#fafafa');

      // ── Bandă header indigo ──────────────────────────────────────
      doc.rect(0, 0, W, 72).fill('#4f46e5');
      // Linie subțire accent deasupra benzii
      doc.rect(0, 0, W, 4).fill('#818cf8');

      // Numele platformei în header (alb)
      doc.fillColor('#ffffff').fontSize(13).font('Regular')
        .text('EduInovatrium', 0, 26, { align: 'center', lineBreak: false, width: W });

      // ── Bordură elegantă ─────────────────────────────────────────
      doc.rect(18, 18, W - 36, H - 36).lineWidth(0.5).strokeColor('#c7d2fe').stroke();
      doc.rect(22, 22, W - 44, H - 44).lineWidth(2).strokeColor('#4f46e5').stroke();

      // ── Medalion decorativ stânga ────────────────────────────────
      const cx = 108, cy = H / 2 + 10;
      doc.circle(cx, cy, 44).fill('#eef2ff');
      doc.circle(cx, cy, 44).lineWidth(1.5).strokeColor('#818cf8').stroke();
      doc.circle(cx, cy, 36).lineWidth(0.5).strokeColor('#c7d2fe').stroke();
      // Stea simplă cu linii
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const x1 = cx + 20 * Math.cos(angle);
        const y1 = cy + 20 * Math.sin(angle);
        const x2 = cx + 30 * Math.cos(angle);
        const y2 = cy + 30 * Math.sin(angle);
        doc.moveTo(x1, y1).lineTo(x2, y2).lineWidth(1).strokeColor('#818cf8').stroke();
      }
      doc.fillColor('#4f46e5').fontSize(9).font('Bold')
        .text('CERTIFICAT', cx - 24, cy - 6, { lineBreak: false })
        .text('VERIFICAT', cx - 20, cy + 4, { lineBreak: false });

      // ── Titlu principal ──────────────────────────────────────────
      doc.fillColor('#1e1b4b').fontSize(30).font('Bold')
        .text('CERTIFICAT DE ABSOLVIRE', 0, 92, { align: 'center', lineBreak: false, width: W });

      // ── Linie decorativă sub titlu ───────────────────────────────
      const lineY = 138;
      doc.moveTo(220, lineY).lineTo(W / 2 - 20, lineY).lineWidth(1).strokeColor('#818cf8').stroke();
      doc.circle(W / 2, lineY, 4).fill('#4f46e5');
      doc.moveTo(W / 2 + 20, lineY).lineTo(W - 220, lineY).lineWidth(1).strokeColor('#818cf8').stroke();

      // ── Corp text ────────────────────────────────────────────────
      doc.fillColor('#6b7280').fontSize(13).font('Regular')
        .text('Aceasta certifică faptul că', 0, 158, { align: 'center', lineBreak: false, width: W });

      doc.fillColor('#111827').fontSize(30).font('Bold')
        .text(studentName, 0, 182, { align: 'center', lineBreak: false, width: W });

      // Linie subțire sub nume
      doc.moveTo(W / 2 - 120, 222).lineTo(W / 2 + 120, 222)
        .lineWidth(0.5).strokeColor('#e0e7ff').stroke();

      doc.fillColor('#6b7280').fontSize(13).font('Regular')
        .text('a finalizat cu succes cursul', 0, 234, { align: 'center', lineBreak: false, width: W });

      doc.fillColor('#4f46e5').fontSize(18).font('Bold')
        .text(`"${courseTitle}"`, 0, 260, { align: 'center', lineBreak: false, width: W });

      // ── Data ─────────────────────────────────────────────────────
      doc.fillColor('#9ca3af').fontSize(11).font('Regular')
        .text(`Data finalizării: ${completedDate}`, 0, 304, { align: 'center', lineBreak: false, width: W });

      // ── Linie semnătură ──────────────────────────────────────────
      doc.moveTo(300, 360).lineTo(540, 360).lineWidth(0.5).strokeColor('#d1d5db').stroke();
      doc.fillColor('#9ca3af').fontSize(9).font('Regular')
        .text('Semnătură autorizată', 300, 365, { lineBreak: false, width: 240, align: 'center' });

      // ── QR Code — poziție fixă în interiorul paginii ─────────────
      const qrX = W - 130;
      const qrY = H - 130;
      doc.image(qrBuffer, qrX, qrY, { width: 80 });
      doc.fillColor('#9ca3af').fontSize(7).font('Regular')
        .text('Verifică autenticitatea', qrX - 5, qrY + 82, { width: 90, align: 'center', lineBreak: false });

      // ── Bandă footer ─────────────────────────────────────────────
      doc.rect(0, H - 28, W, 28).fill('#f0f4ff');
      doc.fillColor('#818cf8').fontSize(8).font('Regular')
        .text('www.eduinovatrium.ro  ·  Certificat generat electronic', 0, H - 18, {
          align: 'center', lineBreak: false, width: W,
        });

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
