import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getMyNotifications(req: any, limit?: string): Promise<{
        notifications: (import("./schemas/notification.schema").Notification & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        unreadCount: number;
    }>;
    markAllRead(req: any): Promise<void>;
    markRead(req: any, id: string): Promise<void>;
}
