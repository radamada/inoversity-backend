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
    orderId?: string,
  ): Promise<NotificationDocument | null> {
    try {
      const notification = new this.notificationModel({
        userId: new Types.ObjectId(userId),
        type,
        title,
        message,
        courseId: courseId ? new Types.ObjectId(courseId) : null,
        orderId: orderId ? new Types.ObjectId(orderId) : null,
      });
      return await notification.save();
    } catch (err: any) {
      // Duplicate key on (userId, type, orderId) — already notified for this order.
      // Idempotent no-op so retried webhooks / re-entered flows don't double-notify.
      if (err?.code === 11000 && orderId) return null;
      throw err;
    }
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

    const cid = new Types.ObjectId(courseId);
    await this.insertInChunks(
      enrollments.map((e) => ({ userId: e.userId, type, title, message, courseId: cid })),
    );
  }

  async notifyUsersBatch(
    userIds: Types.ObjectId[],
    type: NotificationType,
    title: string,
    message: string,
    courseId?: string,
  ): Promise<void> {
    if (!userIds.length) return;
    const cid = courseId ? new Types.ObjectId(courseId) : null;
    await this.insertInChunks(
      userIds.map((userId) => ({ userId, type, title, message, courseId: cid })),
    );
  }

  private async insertInChunks(docs: object[], chunkSize = 500): Promise<void> {
    for (let i = 0; i < docs.length; i += chunkSize) {
      await this.notificationModel.insertMany(docs.slice(i, i + chunkSize));
    }
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
