import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';
import { EnrollmentDocument } from '../enrollments/schemas/enrollment.schema';
export declare class NotificationsService {
    private notificationModel;
    private enrollmentModel;
    constructor(notificationModel: Model<NotificationDocument>, enrollmentModel: Model<EnrollmentDocument>);
    create(userId: string, type: NotificationType, title: string, message: string, courseId?: string): Promise<NotificationDocument>;
    notifyEnrolledUsers(courseId: string, type: NotificationType, title: string, message: string): Promise<void>;
    getForUser(userId: string, limit?: number): Promise<{
        notifications: (Notification & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        unreadCount: number;
    }>;
    markRead(userId: string, notificationId: string): Promise<void>;
    markAllRead(userId: string): Promise<void>;
}
