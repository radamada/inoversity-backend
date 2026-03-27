import { Document, Types } from 'mongoose';
export type EnrollmentDocument = Enrollment & Document;
export declare class Enrollment {
    userId: Types.ObjectId;
    courseId: Types.ObjectId;
    orderId: Types.ObjectId;
    completedLessons: Types.ObjectId[];
    lastAccessedAt: Date | null;
    completedAt: Date | null;
    status: 'active' | 'refunded';
}
export declare const EnrollmentSchema: import("mongoose").Schema<Enrollment, import("mongoose").Model<Enrollment, any, any, any, (Document<unknown, any, Enrollment, any, import("mongoose").DefaultSchemaOptions> & Enrollment & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Enrollment, any, import("mongoose").DefaultSchemaOptions> & Enrollment & {
    _id: Types.ObjectId;
} & {
    __v: number;
}), any, Enrollment>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Enrollment, Document<unknown, {}, Enrollment, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Enrollment & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Enrollment, Document<unknown, {}, Enrollment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Enrollment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    courseId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Enrollment, Document<unknown, {}, Enrollment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Enrollment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    orderId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Enrollment, Document<unknown, {}, Enrollment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Enrollment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    completedLessons?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId[], Enrollment, Document<unknown, {}, Enrollment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Enrollment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastAccessedAt?: import("mongoose").SchemaDefinitionProperty<Date | null, Enrollment, Document<unknown, {}, Enrollment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Enrollment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    completedAt?: import("mongoose").SchemaDefinitionProperty<Date | null, Enrollment, Document<unknown, {}, Enrollment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Enrollment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"active" | "refunded", Enrollment, Document<unknown, {}, Enrollment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Enrollment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Enrollment>;
