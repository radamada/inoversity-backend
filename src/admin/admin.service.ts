import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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

  getUsers(page: number, limit: number) {
    return this.usersService.findAll(page, limit);
  }

  setUserRole(id: string, role: string) {
    return this.usersService.setRole(id, role);
  }

  setUserActive(id: string, isActive: boolean) {
    return this.usersService.setActive(id, isActive);
  }

  getMonthlyRevenue() {
    return this.ordersService.getMonthlyRevenue();
  }

  getOrders(page: number, limit: number) {
    return this.ordersService.findAll(page, limit);
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
