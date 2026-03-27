import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';
import { Enrollment, EnrollmentDocument } from '../enrollments/schemas/enrollment.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    courseId?: string,
  ): Promise<NotificationDocument> {
    const notification = new this.notificationModel({
      userId: new Types.ObjectId(userId),
      type,
      title,
      message,
      courseId: courseId ? new Types.ObjectId(courseId) : null,
    });
    return notification.save();
  }

  async notifyEnrolledUsers(
    courseId: string,
    type: NotificationType,
    title: string,
    message: string,
  ): Promise<void> {
    const enrollments = await this.enrollmentModel
      .find({ courseId: new Types.ObjectId(courseId) })
      .select('userId')
      .lean();

    if (!enrollments.length) return;

    await this.notificationModel.insertMany(
      enrollments.map((e) => ({
        userId: e.userId,
        type,
        title,
        message,
        courseId: new Types.ObjectId(courseId),
      })),
    );
  }

  async getForUser(userId: string, limit = 20) {
    const [notifications, unreadCount] = await Promise.all([
      this.notificationModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments({
        userId: new Types.ObjectId(userId),
        read: false,
      }),
    ]);
    return { notifications, unreadCount };
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.notificationModel.findOneAndUpdate(
      { _id: new Types.ObjectId(notificationId), userId: new Types.ObjectId(userId) },
      { read: true },
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { read: true },
    );
  }
}
