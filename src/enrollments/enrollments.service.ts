import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
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
  private readonly logger = new Logger(EnrollmentsService.name);
  constructor(
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
  ) {}

  async enroll(userId: string, courseId: string, orderId: string): Promise<EnrollmentDocument> {
    // Atomic: reactivate a refunded enrollment — prevents race conditions on re-enrollment
    const reactivated = await this.enrollmentModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        courseId: new Types.ObjectId(courseId),
        status: 'refunded',
      },
      { $set: { status: 'active', orderId: new Types.ObjectId(orderId) } },
      { new: true },
    );
    if (reactivated) {
      await this.courseModel.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });
      return reactivated;
    }

    // Idempotent: return existing active enrollment without double-incrementing count
    const existing = await this.enrollmentModel.findOne({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
    });
    if (existing) return existing;

    // Create new enrollment
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
        // Race condition: another concurrent request just created it — count already incremented by it
        const found = await this.enrollmentModel.findOne({
          userId: new Types.ObjectId(userId),
          courseId: new Types.ObjectId(courseId),
        });
        if (found) return found;
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
    // Find only courses with active enrollments before revoking
    const activeCourseIds = await this.enrollmentModel.distinct('courseId', {
      userId: new Types.ObjectId(userId),
      courseId: { $in: courseIds.map((id) => new Types.ObjectId(id)) },
      status: 'active',
    });

    if (activeCourseIds.length === 0) return;

    await this.enrollmentModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        courseId: { $in: activeCourseIds },
        status: 'active',
      },
      { $set: { status: 'refunded' } },
    );

    // Decrement only courses that actually had active enrollments
    await this.courseModel.updateMany(
      { _id: { $in: activeCourseIds }, enrollmentCount: { $gt: 0 } },
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
      const currentLessonIds = await this.lessonModel
        .find({ courseId: new Types.ObjectId(courseId) })
        .distinct('_id');
      const currentIdsSet = new Set(currentLessonIds.map((id: any) => id.toString()));
      const validCount = enrollment.completedLessons.filter((id) =>
        currentIdsSet.has(id.toString()),
      ).length;
      if (currentIdsSet.size > 0 && validCount >= currentIdsSet.size) {
        enrollment.completedAt = new Date();
        if (!enrollment.verificationCode) enrollment.verificationCode = randomUUID();
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

    // Validate that the lesson actually belongs to this course (prevents count inflation)
    const lessonExists = await this.lessonModel.exists({
      _id: new Types.ObjectId(lessonId),
      courseId: new Types.ObjectId(courseId),
    });
    if (!lessonExists) throw new NotFoundException('Lecția nu există în acest curs');

    const lessonOid = new Types.ObjectId(lessonId);
    const alreadyDone = enrollment.completedLessons.some(
      (id) => id.toString() === lessonId,
    );
    if (!alreadyDone) {
      enrollment.completedLessons.push(lessonOid);
    }
    enrollment.lastAccessedAt = new Date();

    if (!enrollment.completedAt) {
      // Count only lessons that still exist in the course (handles instructor deleting lessons)
      const currentLessonIds = await this.lessonModel
        .find({ courseId: new Types.ObjectId(courseId) })
        .distinct('_id');
      const currentIdsSet = new Set(currentLessonIds.map((id: any) => id.toString()));
      const validCount = enrollment.completedLessons.filter((id) =>
        currentIdsSet.has(id.toString()),
      ).length;
      if (currentIdsSet.size > 0 && validCount >= currentIdsSet.size) {
        enrollment.completedAt = new Date();
        if (!enrollment.verificationCode) enrollment.verificationCode = randomUUID();
      }
    }

    return enrollment.save();
  }

  async submitQuizAttempt(
    userId: string,
    courseId: string,
    quizId: string,
    answers: number[],
  ): Promise<{ score: number; passed: boolean; correctAnswers: number; totalQuestions: number }> {
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

    // Fetch quiz lesson and validate it belongs to this course
    const quiz = await this.lessonModel.findOne({
      _id: new Types.ObjectId(quizId),
      courseId: new Types.ObjectId(courseId),
      type: 'quiz',
    });
    if (!quiz) throw new NotFoundException('Quiz-ul nu există în acest curs');

    const questions = quiz.questions as { question: string; options: string[]; correctIndex: number }[];
    const totalQuestions = questions.length;
    if (totalQuestions === 0) throw new BadRequestException('Quiz-ul nu are întrebări');

    // Calculate score
    let correctAnswers = 0;
    for (let i = 0; i < totalQuestions; i++) {
      if (answers[i] !== undefined && answers[i] === questions[i].correctIndex) {
        correctAnswers++;
      }
    }
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= 90;

    // Record attempt
    (enrollment.quizAttempts as any[]).push({
      quizId: new Types.ObjectId(quizId),
      score,
      passed,
      attemptedAt: new Date(),
    });

    // If passed, add to completedLessons (idempotent)
    if (passed) {
      const quizOid = new Types.ObjectId(quizId);
      const alreadyDone = enrollment.completedLessons.some((id) => id.toString() === quizId);
      if (!alreadyDone) {
        enrollment.completedLessons.push(quizOid);
      }
      enrollment.lastAccessedAt = new Date();

      // Check if all lessons completed
      if (!enrollment.completedAt) {
        const currentLessonIds = await this.lessonModel
          .find({ courseId: new Types.ObjectId(courseId) })
          .distinct('_id');
        const currentIdsSet = new Set(currentLessonIds.map((id: any) => id.toString()));
        const validCount = enrollment.completedLessons.filter((id) =>
          currentIdsSet.has(id.toString()),
        ).length;
        if (currentIdsSet.size > 0 && validCount >= currentIdsSet.size) {
          enrollment.completedAt = new Date();
          if (!enrollment.verificationCode) enrollment.verificationCode = randomUUID();
        }
      }
    }

    await enrollment.save();
    return { score, passed, correctAnswers, totalQuestions };
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

    if (!process.env.FRONTEND_URL) {
      this.logger.warn('FRONTEND_URL env var is not set — certificate verify URL will use localhost fallback');
    }
    const code = enrollment.verificationCode ?? enrollment._id.toString();
    const verifyUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/verify-certificate/${code}`;
    const qrDataUrl: string = await QRCode.toDataURL(verifyUrl, { width: 100, margin: 1 });
    // Convert data URL to buffer
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    const fontsDir = join(__dirname, '..', 'assets', 'fonts');
    const fontRegular = join(fontsDir, 'Roboto-Regular.ttf');
    const fontBold    = join(fontsDir, 'Roboto-Bold.ttf');

    return new Promise((resolve, reject) => {
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

      // Layout: bandă indigo stânga (S px) + conținut dreapta
      const S  = 218;              // lățime bandă stânga
      const RX = S + 4;            // x start conținut dreapta
      const RW = W - RX - 22;      // lățime conținut dreapta
      const RCX = RX + RW / 2;     // centrul zonei drepte

      // ── Fundal ────────────────────────────────────────────────────
      doc.rect(0, 0, W, H).fill('#f8f9fe');

      // ── Bandă indigo stânga ───────────────────────────────────────
      doc.rect(0, 0, S, H).fill('#312e81');

      // Cerc decorativ translucid în bandă
      doc.save().opacity(0.08).circle(S / 2, H / 2, 90).fill('#a5b4fc').restore();
      doc.save().opacity(0.05).circle(S / 2, H * 0.3, 60).fill('#c7d2fe').restore();

      // Accent top al benzii
      doc.rect(0, 0, S, 6).fill('#818cf8');

      // Numele platformei sus în bandă
      doc.fillColor('#c7d2fe').fontSize(10.5).font('Regular')
        .text('Inoversity', 0, 24, { width: S, align: 'center', lineBreak: false });

      // Liniuțe decorative sub titlu în bandă
      doc.moveTo(28, 46).lineTo(S - 28, 46).lineWidth(0.4).strokeColor('#4f46e5').stroke();
      doc.moveTo(28, 51).lineTo(S - 28, 51).lineWidth(0.4).strokeColor('#4f46e5').stroke();

      // Sigiliu circular în bandă (centrat sus-mijloc)
      const sx = S / 2, sy = 170;
      doc.save().opacity(0.18).circle(sx, sy, 52).fill('#818cf8').restore();
      doc.circle(sx, sy, 52).lineWidth(1.5).strokeColor('#6366f1').stroke();
      doc.circle(sx, sy, 44).lineWidth(0.5).strokeColor('#4f46e5').stroke();
      // Raze stea
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12;
        doc.moveTo(sx + 26 * Math.cos(a), sy + 26 * Math.sin(a))
           .lineTo(sx + 36 * Math.cos(a), sy + 36 * Math.sin(a))
           .lineWidth(0.7).strokeColor('#818cf8').stroke();
      }
      doc.fillColor('#e0e7ff').fontSize(8.5).font('Bold')
        .text('CERTIFICAT', sx - 24, sy - 11, { lineBreak: false });
      doc.fillColor('#c7d2fe').fontSize(7.5).font('Regular')
        .text('VERIFICAT', sx - 19, sy + 3, { lineBreak: false });

      // Text vertical rotit în bandă
      doc.save();
      doc.translate(S / 2, H * 0.62);
      doc.rotate(-90);
      doc.fillColor('#6366f1').fontSize(8.5).font('Regular')
        .text('C E R T I F I C A T   D E   A B S O L V I R E', -108, -4, { lineBreak: false });
      doc.restore();

      // QR code în bandă (jos)
      const qrW = 78;
      const qrXl = Math.round((S - qrW) / 2);
      const qrYl = H - qrW - 50;
      doc.image(qrBuffer, qrXl, qrYl, { width: qrW });
      doc.fillColor('#a5b4fc').fontSize(6.5).font('Regular')
        .text('Verifică autenticitatea', 0, qrYl + qrW + 3, { width: S, align: 'center', lineBreak: false });

      // Footer bandă stânga
      doc.rect(0, H - 26, S, 26).fill('#1e1b4b');
      doc.fillColor('#6366f1').fontSize(7).font('Regular')
        .text('© ' + new Date().getFullYear() + ' Inoversity', 0, H - 16, { width: S, align: 'center', lineBreak: false });

      // Separator vertical (dungă accent între bandă și conținut)
      doc.rect(S, 0, 4, H).fill('#4f46e5');

      // ── ZONĂ CONȚINUT DREAPTA ─────────────────────────────────────

      // Accent top
      doc.rect(RX, 0, RW + 22, 6).fill('#e0e7ff');

      // Titlu principal
      doc.fillColor('#1e1b4b').fontSize(23).font('Bold')
        .text('CERTIFICAT DE ABSOLVIRE', RX, 32, { width: RW, align: 'center', lineBreak: false });

      // Ornament sub titlu
      const d1Y = 74;
      doc.moveTo(RX + 20, d1Y).lineTo(RCX - 20, d1Y).lineWidth(0.8).strokeColor('#c7d2fe').stroke();
      doc.circle(RCX, d1Y, 3.5).fill('#4f46e5');
      doc.moveTo(RCX + 20, d1Y).lineTo(W - 22, d1Y).lineWidth(0.8).strokeColor('#c7d2fe').stroke();

      // "Aceasta certifică că"
      doc.fillColor('#9ca3af').fontSize(12.5).font('Regular')
        .text('Aceasta certifică că', RX, 96, { width: RW, align: 'center', lineBreak: false });

      // Numele studentului
      doc.fillColor('#111827').fontSize(32).font('Bold')
        .text(studentName, RX, 125, { width: RW, align: 'center', lineBreak: false });

      // Subliniere sub nume
      doc.moveTo(RCX - 115, 172).lineTo(RCX + 115, 172).lineWidth(0.5).strokeColor('#e0e7ff').stroke();

      // "a finalizat..."
      doc.fillColor('#9ca3af').fontSize(12.5).font('Regular')
        .text('a finalizat cu succes cursul', RX, 186, { width: RW, align: 'center', lineBreak: false });

      // Titlul cursului
      doc.fillColor('#4338ca').fontSize(18).font('Bold')
        .text(`"${courseTitle}"`, RX, 214, { width: RW, align: 'center', lineBreak: false });

      // Data
      doc.fillColor('#9ca3af').fontSize(11).font('Regular')
        .text(`Data finalizării: ${completedDate}`, RX, 264, { width: RW, align: 'center', lineBreak: false });

      // Separator orizontal
      doc.moveTo(RX + 40, 296).lineTo(W - 22, 296).lineWidth(0.3).strokeColor('#e5e7eb').stroke();

      // Bloc semnătură
      const sigY = 390;
      doc.moveTo(RCX - 90, sigY).lineTo(RCX + 90, sigY).lineWidth(0.5).strokeColor('#d1d5db').stroke();
      doc.fillColor('#374151').fontSize(10).font('Bold')
        .text('Inoversity', RCX - 90, sigY + 8, { width: 180, align: 'center', lineBreak: false });
      doc.fillColor('#9ca3af').fontSize(8.5).font('Regular')
        .text('Platformă educațională autorizată', RCX - 90, sigY + 22, { width: 180, align: 'center', lineBreak: false });

      // ID certificat (mic, jos)
      doc.fillColor('#d1d5db').fontSize(7).font('Regular')
        .text(`ID: ${enrollment._id.toString()}`, RX, H - 47, { width: RW, align: 'center', lineBreak: false });

      // Footer bandă dreapta
      doc.rect(RX, H - 28, W - RX, 28).fill('#eef2ff');
      doc.fillColor('#818cf8').fontSize(8).font('Regular')
        .text('www.inoversity.ro  ·  Certificat generat electronic', RX, H - 17, {
          width: RW, align: 'center', lineBreak: false,
        });

      doc.end();
    });
  }

  async verifyCertificate(code: string): Promise<object> {
    // Look up only by UUID verificationCode — ObjectId fallback removed (enumerable)
    const query = { verificationCode: code, status: 'active' };

    const enrollment = await this.enrollmentModel
      .findOne(query)
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
