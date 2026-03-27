import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Order, OrderDocument } from './schemas/order.schema';
import { CoursesService } from '../courses/courses.service';
import { CartService } from '../cart/cart.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class OrdersService {
    private orderModel;
    private coursesService;
    private cartService;
    private enrollmentsService;
    private notificationsService;
    private config;
    private stripe;
    constructor(orderModel: Model<OrderDocument>, coursesService: CoursesService, cartService: CartService, enrollmentsService: EnrollmentsService, notificationsService: NotificationsService, config: ConfigService);
    createOrder(userId: string): Promise<{
        orderId: Types.ObjectId;
        clientSecret: string | null;
        total: number;
    }>;
    getMyOrders(userId: string): Promise<(import("mongoose").Document<unknown, {}, OrderDocument, {}, import("mongoose").DefaultSchemaOptions> & Order & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    getOrderById(id: string, userId: string): Promise<import("mongoose").Document<unknown, {}, OrderDocument, {}, import("mongoose").DefaultSchemaOptions> & Order & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    confirmPayment(paymentIntentId: string): Promise<void>;
    findAll(page?: number, limit?: number): Promise<{
        orders: (import("mongoose").Document<unknown, {}, OrderDocument, {}, import("mongoose").DefaultSchemaOptions> & Order & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
        total: number;
        page: number;
        pages: number;
    }>;
    refund(orderId: string): Promise<OrderDocument>;
    createAndPayFake(userId: string): Promise<{
        orderId: Types.ObjectId;
        total: number;
    }>;
    getStats(): Promise<{
        totalRevenue: any;
        totalOrders: number;
        pendingOrders: number;
    }>;
}
