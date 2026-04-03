import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { Enrollment, EnrollmentDocument } from '../enrollments/schemas/enrollment.schema';
import { UsersService } from '../users/users.service';
import { OrdersService } from '../orders/orders.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
    private usersService: UsersService,
    private ordersService: OrdersService,
    private enrollmentsService: EnrollmentsService,
  ) {}

  async getStats() {
    const [totalUsers, totalCourses, publishedCourses, revenueStats, totalEnrollments, uniqueStudentsArr] =
      await Promise.all([
        this.userModel.countDocuments(),
        this.courseModel.countDocuments(),
        this.courseModel.countDocuments({ published: true }),
        this.ordersService.getStats(),
        this.enrollmentModel.countDocuments({ status: 'active', orderId: { $ne: null } }),
        this.enrollmentModel.distinct('userId', { status: 'active', orderId: { $ne: null } }),
      ]);

    return {
      totalUsers,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      uniqueStudents: uniqueStudentsArr.length,
      ...revenueStats,
    };
  }

  getUsers(page: number, limit: number, search?: string) {
    return this.usersService.findAll(page, limit, search);
  }

  setUserRole(id: string, role: string, adminId?: string) {
    if (adminId && id === adminId.toString()) {
      throw new BadRequestException('Nu îți poți schimba propriul rol');
    }
    return this.usersService.setRole(id, role);
  }

  setUserActive(id: string, isActive: boolean, adminId?: string) {
    if (adminId && id === adminId.toString()) {
      throw new BadRequestException('Nu îți poți dezactiva propriul cont');
    }
    return this.usersService.setActive(id, isActive);
  }

  getMonthlyRevenue() {
    return this.ordersService.getMonthlyRevenue();
  }

  async getOrders(
    page: number,
    limit: number,
    filters: { status?: string; instructorId?: string; courseId?: string; dateFrom?: string; dateTo?: string } = {},
  ) {
    let courseIds: any[] | undefined;
    if (filters.instructorId || filters.courseId) {
      const courseQuery: any = {};
      if (filters.instructorId) courseQuery.instructorId = new Types.ObjectId(filters.instructorId);
      if (filters.courseId) courseQuery._id = new Types.ObjectId(filters.courseId);
      const courses = await this.courseModel.find(courseQuery).select('_id').lean();
      courseIds = courses.map((c) => c._id);
      // If instructor has no courses, return empty
      if (courseIds.length === 0) return { orders: [], total: 0, page, pages: 0 };
    }
    const result = await this.ordersService.findAll(page, limit, {
      status: filters.status,
      courseIds,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });

    // Enrich items with instructorName
    const allCourseIds = [
      ...new Set(
        result.orders.flatMap((o: any) => o.items.map((i: any) => i.courseId.toString())),
      ),
    ];
    if (allCourseIds.length > 0) {
      const courseDocs = await this.courseModel
        .find({ _id: { $in: allCourseIds } })
        .select('_id instructorId')
        .populate('instructorId', 'name')
        .lean();
      const courseInstructorMap = new Map<string, string>(
        courseDocs.map((c: any) => [
          c._id.toString(),
          c.instructorId?.name ?? '—',
        ]),
      );
      const enrichedOrders = result.orders.map((o: any) => {
        const plain = o.toObject ? o.toObject() : { ...o };
        return {
          ...plain,
          items: plain.items.map((item: any) => ({
            ...item,
            instructorName: courseInstructorMap.get(item.courseId?.toString()) ?? '—',
          })),
        };
      });
      return { ...result, orders: enrichedOrders };
    }

    return result;
  }

  refundOrder(orderId: string, adminId: string) {
    return this.ordersService.refund(orderId, adminId);
  }

  async getInstructors() {
    return this.userModel
      .find({ role: 'instructor' })
      .select('_id name email')
      .sort({ name: 1 })
      .lean()
      .exec();
  }

  async getCoursesList(instructorId?: string) {
    const query: any = {};
    if (instructorId) query.instructorId = new Types.ObjectId(instructorId);
    return this.courseModel
      .find(query)
      .select('_id title instructorId')
      .populate('instructorId', 'name')
      .sort({ title: 1 })
      .limit(500)
      .lean();
  }

  async getAllCourses(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [courses, total] = await Promise.all([
      this.courseModel
        .find()
        .populate('instructorId', 'name email')
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.courseModel.countDocuments(),
    ]);
    return { courses, total, page, pages: Math.ceil(total / limit) };
  }
}
