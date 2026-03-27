import { Document, Types } from 'mongoose';
export type NotificationDocument = Notification & Document;
export type NotificationType = 'purchase' | 'refund' | 'course_updated';
export declare class Notification {
    userId: Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    read: boolean;
    courseId: Types.ObjectId | null;
}
export declare const NotificationSchema: import("mongoose").Schema<Notification, import("mongoose").Model<Notification, any, any, any, (Document<unknown, any, Notification, any, import("mongoose").DefaultSchemaOptions> & Notification & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Notification, any, import("mongoose").DefaultSchemaOptions> & Notification & {
    _id: Types.ObjectId;
} & {
    __v: number;
}), any, Notification>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Notification, Document<unknown, {}, Notification, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Notification & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Notification, Document<unknown, {}, Notification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Notification & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    type?: import("mongoose").SchemaDefinitionProperty<NotificationType, Notification, Document<unknown, {}, Notification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Notification & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, Notification, Document<unknown, {}, Notification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Notification & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    message?: import("mongoose").SchemaDefinitionProperty<string, Notification, Document<unknown, {}, Notification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Notification & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    read?: import("mongoose").SchemaDefinitionProperty<boolean, Notification, Document<unknown, {}, Notification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Notification & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    courseId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null, Notification, Document<unknown, {}, Notification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Notification & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Notification>;
