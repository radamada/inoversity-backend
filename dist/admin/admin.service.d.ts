import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { UsersService } from '../users/users.service';
import { OrdersService } from '../orders/orders.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
export declare class AdminService {
    private userModel;
    private courseModel;
    private usersService;
    private ordersService;
    private enrollmentsService;
    constructor(userModel: Model<UserDocument>, courseModel: Model<CourseDocument>, usersService: UsersService, ordersService: OrdersService, enrollmentsService: EnrollmentsService);
    getStats(): Promise<{
        totalRevenue: any;
        totalOrders: number;
        pendingOrders: number;
        totalUsers: number;
        totalCourses: number;
        publishedCourses: number;
    }>;
    getUsers(page: number, limit: number): Promise<{
        users: (import("mongoose").Document<unknown, {}, UserDocument, {}, import("mongoose").DefaultSchemaOptions> & User & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
        total: number;
        page: number;
        pages: number;
    }>;
    setUserRole(id: string, role: string): Promise<UserDocument>;
    setUserActive(id: string, isActive: boolean): Promise<UserDocument>;
    getOrders(page: number, limit: number): Promise<{
        orders: (import("mongoose").Document<unknown, {}, import("../orders/schemas/order.schema").OrderDocument, {}, import("mongoose").DefaultSchemaOptions> & import("../orders/schemas/order.schema").Order & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
        total: number;
        page: number;
        pages: number;
    }>;
    refundOrder(orderId: string): Promise<import("../orders/schemas/order.schema").OrderDocument>;
    getAllCourses(page: number, limit: number): Promise<{
        courses: (import("mongoose").Document<unknown, {}, CourseDocument, {}, import("mongoose").DefaultSchemaOptions> & Course & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
        total: number;
        page: number;
        pages: number;
    }>;
}
