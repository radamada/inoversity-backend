import { CartService } from './cart.service';
declare class AddToCartDto {
    courseId: string;
}
export declare class CartController {
    private readonly cartService;
    constructor(cartService: CartService);
    getCart(user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/cart.schema").CartDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/cart.schema").Cart & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | {
        userId: string;
        items: never[];
    }>;
    addItem(user: any, dto: AddToCartDto): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/cart.schema").CartDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/cart.schema").Cart & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | {
        userId: string;
        items: never[];
    }>;
    removeItem(user: any, courseId: string): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/cart.schema").CartDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/cart.schema").Cart & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | {
        userId: string;
        items: never[];
    }>;
    clearCart(user: any): Promise<void>;
}
export {};
