import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { CoursesService } from '../courses/courses.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
export declare class CartService {
    private cartModel;
    private coursesService;
    private enrollmentsService;
    constructor(cartModel: Model<CartDocument>, coursesService: CoursesService, enrollmentsService: EnrollmentsService);
    getCart(userId: string): Promise<(import("mongoose").Document<unknown, {}, CartDocument, {}, import("mongoose").DefaultSchemaOptions> & Cart & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | {
        userId: string;
        items: never[];
    }>;
    addItem(userId: string, courseId: string): Promise<(import("mongoose").Document<unknown, {}, CartDocument, {}, import("mongoose").DefaultSchemaOptions> & Cart & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | {
        userId: string;
        items: never[];
    }>;
    removeItem(userId: string, courseId: string): Promise<(import("mongoose").Document<unknown, {}, CartDocument, {}, import("mongoose").DefaultSchemaOptions> & Cart & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | {
        userId: string;
        items: never[];
    }>;
    clearCart(userId: string): Promise<void>;
    getCartItems(userId: string): Promise<Types.ObjectId[]>;
}
