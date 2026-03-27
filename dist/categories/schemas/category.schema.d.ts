import { Document } from 'mongoose';
export type CategoryDocument = Category & Document;
export declare class Category {
    name: string;
    slug: string;
    icon: string;
}
export declare const CategorySchema: import("mongoose").Schema<Category, import("mongoose").Model<Category, any, any, any, (Document<unknown, any, Category, any, import("mongoose").DefaultSchemaOptions> & Category & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Category, any, import("mongoose").DefaultSchemaOptions> & Category & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, Category>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Category, Document<unknown, {}, Category, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Category & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string, Category, Document<unknown, {}, Category, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Category & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    slug?: import("mongoose").SchemaDefinitionProperty<string, Category, Document<unknown, {}, Category, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Category & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    icon?: import("mongoose").SchemaDefinitionProperty<string, Category, Document<unknown, {}, Category, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Category & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Category>;
