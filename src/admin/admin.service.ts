import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { UsersService } from '../users/users.service';
import { OrdersService } from '../orders/orders.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    private usersService: UsersService,
    private ordersService: OrdersService,
    private enrollmentsService: EnrollmentsService,
  ) {}

  async getStats() {
    const [totalUsers, totalCourses, publishedCourses, revenueStats] =
      await Promise.all([
        this.userModel.countDocuments(),
        this.courseModel.countDocuments(),
        this.courseModel.countDocuments({ published: true }),
        this.ordersService.getStats(),
      ]);

    return {
      totalUsers,
      totalCourses,
      publishedCourses,
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

  getOrders(page: number, limit: number) {
    return this.ordersService.findAll(page, limit);
  }

  refundOrder(orderId: string) {
    return this.ordersService.refund(orderId);
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
