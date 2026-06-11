import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { Section, SectionDocument } from '../courses/schemas/section.schema';
import { Lesson, LessonDocument } from '../courses/schemas/lesson.schema';
import { Enrollment, EnrollmentDocument } from '../enrollments/schemas/enrollment.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { CoursesService } from '../courses/courses.service';

@Injectable()
export class InstructorService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(Section.name) private sectionModel: Model<SectionDocument>,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private coursesService: CoursesService,
  ) {}

  // ── Own courses ────────────────────────────────────────────────────────────

  async getCourseById(courseId: string, instructorId: string, isAdmin = false) {
    await this.assertCourseOwner(courseId, instructorId, isAdmin);
    return this.coursesService.findById(courseId);
  }

  async getMyCourses(instructorId: string) {
    return this.courseModel
      .find({ instructorId: new Types.ObjectId(instructorId) })
      .select('title slug thumbnail published price enrollmentCount createdAt')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getMyStats(instructorId: string) {
    const myCourses = await this.courseModel
      .find({ instructorId: new Types.ObjectId(instructorId) })
      .select('_id published')
      .lean();

    const courseIds = myCourses.map((c) => c._id);
    const totalCourses = myCourses.length;
    const publishedCourses = myCourses.filter((c) => c.published).length;

    const [totalEnrollments, uniqueStudents] = courseIds.length > 0
      ? await Promise.all([
          this.enrollmentModel.countDocuments({ courseId: { $in: courseIds }, orderId: { $ne: null } }),
          this.enrollmentModel.distinct('userId', { courseId: { $in: courseIds }, orderId: { $ne: null } }).then((ids) => ids.length),
        ])
      : [0, 0];

    let totalRevenue = 0;
    if (courseIds.length > 0) {
      const revenueAgg = await this.orderModel.aggregate([
        { $match: { status: 'paid', 'items.courseId': { $in: courseIds } } },
        { $unwind: '$items' },
        { $match: { 'items.courseId': { $in: courseIds } } },
        { $group: { _id: null, total: { $sum: '$items.price' } } },
      ]);
      totalRevenue = revenueAgg[0]?.total ?? 0;
    }

    return { totalCourses, publishedCourses, totalEnrollments, uniqueStudents, totalRevenue };
  }

  async getMonthlyRevenue(instructorId: string): Promise<{ month: string; revenue: number }[]> {
    const myCourses = await this.courseModel
      .find({ instructorId: new Types.ObjectId(instructorId) })
      .select('_id')
      .lean();

    if (!myCourses.length) return this.emptyMonths();

    const courseIds = myCourses.map((c) => c._id);

    const raw = await this.orderModel.aggregate([
      { $match: { status: 'paid', 'items.courseId': { $in: courseIds } } },
      { $unwind: '$items' },
      { $match: { 'items.courseId': { $in: courseIds } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$items.price' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Build a map of "YYYY-MM" → revenue
    const map = new Map<string, number>(
      raw.map((r) => [
        `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
        Math.round(r.revenue * 100) / 100,
      ]),
    );

    return this.emptyMonths().map((m) => ({ ...m, revenue: map.get(m.month) ?? 0 }));
  }

  private emptyMonths(): { month: string; revenue: number }[] {
    const months: { month: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: key, revenue: 0 });
    }
    return months;
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  async getMyOrders(
    instructorId: string,
    page = 1,
    limit = 20,
    filters: {
      status?: string;
      courseId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    } = {},
  ) {
    const myCourses = await this.courseModel
      .find({ instructorId: new Types.ObjectId(instructorId) })
      .select('_id title')
      .lean();
    const allCourseIds = myCourses.map((c) => c._id);

    if (allCourseIds.length === 0) return { orders: [], total: 0, page, pages: 0, courses: [] };

    // Restrict to specific course if provided
    let courseIds = allCourseIds;
    if (filters.courseId) {
      const reqId = new Types.ObjectId(filters.courseId);
      const owned = allCourseIds.find((id) => id.toString() === reqId.toString());
      courseIds = owned ? [owned] : [];
    }

    const filter: any = {
      status: filters.status && ['paid', 'refunded', 'pending', 'cancelled'].includes(filters.status)
        ? filters.status
        : { $in: ['paid', 'refunded'] },
      'items.courseId': { $in: courseIds },
    };

    if (filters.dateFrom || filters.dateTo) {
      filter.createdAt = {};
      if (filters.dateFrom) filter.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      { $match: filter },
      {
        // Use let+pipeline form (supported MongoDB 3.6+) instead of combining
        // localField/foreignField with pipeline (MongoDB 5.0+ only).
        $lookup: {
          from: 'users',
          let: { uid: '$userId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
            { $project: { name: 1, email: 1, avatar: 1 } },
          ],
          as: 'userId',
        },
      },
      // preserveNullAndEmptyArrays: true — keep orders even if buyer account was deleted
      { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } },
    ];

    if (filters.search) {
      const escaped = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'userId.name': { $regex: regex } },
            { 'userId.email': { $regex: regex } },
          ],
        },
      });
    }

    const countPipeline = [...pipeline, { $count: 'total' }];
    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const [results, countResult] = await Promise.all([
      this.orderModel.aggregate(pipeline),
      this.orderModel.aggregate(countPipeline),
    ]);
    const total = countResult[0]?.total ?? 0;

    const courseIdSet = new Set(allCourseIds.map((id) => id.toString()));

    const enrichedResults = results.map((order: any) => ({
      ...order,
      items: order.items.filter((item: any) => courseIdSet.has(item.courseId.toString())),
      myRevenue: order.status === 'refunded'
        ? 0
        : order.items
            .filter((item: any) => courseIdSet.has(item.courseId.toString()))
            .reduce((sum: number, item: any) => sum + item.price, 0),
    }));

    // Compute available statuses from returned results
    const availableStatuses = [...new Set(enrichedResults.map((o: any) => o.status))];

    return {
      orders: enrichedResults,
      total,
      page,
      pages: Math.ceil(total / limit),
      courses: myCourses.map((c: any) => ({ _id: c._id.toString(), title: c.title })),
      availableStatuses,
    };
  }

  // ── Ownership helpers ──────────────────────────────────────────────────────

  private async assertCourseOwner(courseId: string, instructorId: string, isAdmin = false) {
    if (isAdmin) return;
    const course = await this.courseModel.findById(courseId).select('instructorId').lean();
    if (!course) throw new NotFoundException('Cursul nu a fost găsit');
    if (course.instructorId.toString() !== instructorId) {
      throw new ForbiddenException('Nu ai permisiunea de a modifica acest curs');
    }
  }

  private async assertSectionOwner(sectionId: string, instructorId: string, isAdmin = false) {
    if (isAdmin) return;
    const section = await this.sectionModel.findById(sectionId).select('courseId').lean();
    if (!section) throw new NotFoundException('Secțiunea nu a fost găsită');
    await this.assertCourseOwner(section.courseId.toString(), instructorId);
  }

  private async assertLessonOwner(lessonId: string, instructorId: string, isAdmin = false) {
    if (isAdmin) return;
    const lesson = await this.lessonModel.findById(lessonId).select('courseId').lean();
    if (!lesson) throw new NotFoundException('Lecția nu a fost găsită');
    await this.assertCourseOwner(lesson.courseId.toString(), instructorId);
  }

  // ── Sections ──────────────────────────────────────────────────────────────

  async createSection(courseId: string, title: string, instructorId: string, isAdmin = false) {
    await this.assertCourseOwner(courseId, instructorId, isAdmin);
    return this.coursesService.createSection(courseId, title);
  }

  async updateSection(sectionId: string, dto: any, instructorId: string, isAdmin = false) {
    await this.assertSectionOwner(sectionId, instructorId, isAdmin);
    return this.coursesService.updateSection(sectionId, dto);
  }

  async deleteSection(sectionId: string, instructorId: string, isAdmin = false) {
    await this.assertSectionOwner(sectionId, instructorId, isAdmin);
    return this.coursesService.deleteSection(sectionId);
  }

  // ── Lessons ───────────────────────────────────────────────────────────────

  async createLesson(sectionId: string, courseId: string, dto: any, instructorId: string, isAdmin = false) {
    await this.assertCourseOwner(courseId, instructorId, isAdmin);
    return this.coursesService.createLesson(sectionId, courseId, dto);
  }

  async updateLesson(lessonId: string, dto: any, instructorId: string, isAdmin = false) {
    await this.assertLessonOwner(lessonId, instructorId, isAdmin);
    return this.coursesService.updateLesson(lessonId, dto);
  }

  async deleteLesson(lessonId: string, instructorId: string, isAdmin = false) {
    await this.assertLessonOwner(lessonId, instructorId, isAdmin);
    return this.coursesService.deleteLesson(lessonId);
  }

  // ── Quizzes ───────────────────────────────────────────────────────────────

  async createQuiz(
    courseId: string,
    sectionId: string,
    dto: { title: string; questions: { question: string; options: string[]; correctIndexes: number[] }[] },
    instructorId: string,
    isAdmin = false,
  ) {
    await this.assertCourseOwner(courseId, instructorId, isAdmin);
    return this.coursesService.createQuiz(courseId, sectionId, dto);
  }

  async updateQuiz(
    courseId: string,
    quizId: string,
    dto: Partial<{ title: string; questions: { question: string; options: string[]; correctIndexes: number[] }[] }>,
    instructorId: string,
    isAdmin = false,
  ) {
    await this.assertCourseOwner(courseId, instructorId, isAdmin);
    return this.coursesService.updateQuiz(quizId, courseId, dto);
  }

  // ── Publish ───────────────────────────────────────────────────────────────

  async togglePublish(courseId: string, instructorId: string, isAdmin = false) {
    await this.assertCourseOwner(courseId, instructorId, isAdmin);
    return this.coursesService.togglePublish(courseId);
  }
}
