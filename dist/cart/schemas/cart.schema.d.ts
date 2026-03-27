import { Document, Types } from 'mongoose';
export type CartDocument = Cart & Document;
export declare class Cart {
    userId: Types.ObjectId;
    items: Types.ObjectId[];
}
export declare const CartSchema: import("mongoose").Schema<Cart, import("mongoose").Model<Cart, any, any, any, (Document<unknown, any, Cart, any, import("mongoose").DefaultSchemaOptions> & Cart & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Cart, any, import("mongoose").DefaultSchemaOptions> & Cart & {
    _id: Types.ObjectId;
} & {
    __v: number;
}), any, Cart>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Cart, Document<unknown, {}, Cart, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Cart & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Cart & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    items?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId[], Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Cart & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Cart>;
