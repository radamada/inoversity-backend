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
      const paidOrders = await this.orderModel
        .find({ status: 'paid', 'items.courseId': { $in: courseIds } })
        .select('items')
        .lean();

      const courseIdSet = new Set(courseIds.map((id) => id.toString()));
      for (const order of paidOrders) {
        for (const item of order.items) {
          if (courseIdSet.has(item.courseId.toString())) {
            totalRevenue += item.price;
          }
        }
      }
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
    let query = this.orderModel.find(filter).populate('userId', 'name email').sort({ createdAt: -1 });

    // Search by student name/email (post-populate filter)
    const [allMatching, total] = await Promise.all([
      query.lean(),
      this.orderModel.countDocuments(filter),
    ]);

    const courseIdSet = new Set(allCourseIds.map((id) => id.toString()));

    let results = allMatching.map((order) => ({
      ...order,
      items: order.items.filter((item) => courseIdSet.has(item.courseId.toString())),
      myRevenue: order.status === 'refunded'
        ? 0
        : order.items
            .filter((item) => courseIdSet.has(item.courseId.toString()))
            .reduce((sum, item) => sum + item.price, 0),
    }));

    // Client-side search filter (name/email)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter((o: any) =>
        o.userId?.name?.toLowerCase().includes(q) ||
        o.userId?.email?.toLowerCase().includes(q),
      );
    }

    const paginated = results.slice(skip, skip + limit);
    const realTotal = filters.search ? results.length : total;

    return {
      orders: paginated,
      total: realTotal,
      page,
      pages: Math.ceil(realTotal / limit),
      courses: myCourses.map((c: any) => ({ _id: c._id.toString(), title: c.title })),
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

  // ── Publish ───────────────────────────────────────────────────────────────

  async togglePublish(courseId: string, instructorId: string, isAdmin = false) {
    await this.assertCourseOwner(courseId, instructorId, isAdmin);
    return this.coursesService.togglePublish(courseId);
  }
}
