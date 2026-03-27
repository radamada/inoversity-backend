import { OrdersService } from './orders.service';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    createOrder(user: any): Promise<{
        orderId: import("mongoose").Types.ObjectId;
        clientSecret: string | null;
        total: number;
    }>;
    fakePay(user: any): Promise<{
        orderId: import("mongoose").Types.ObjectId;
        total: number;
    }>;
    getMyOrders(user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/order.schema").OrderDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/order.schema").Order & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    getOrder(user: any, id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/order.schema").OrderDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/order.schema").Order & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
}
