import { Document, Types } from 'mongoose';
export type LessonDocument = Lesson & Document;
export declare class Lesson {
    courseId: Types.ObjectId;
    sectionId: Types.ObjectId;
    title: string;
    description: string;
    cdnVideoId: string;
    duration: number;
    order: number;
    isFree: boolean;
}
export declare const LessonSchema: import("mongoose").Schema<Lesson, import("mongoose").Model<Lesson, any, any, any, (Document<unknown, any, Lesson, any, import("mongoose").DefaultSchemaOptions> & Lesson & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Lesson, any, import("mongoose").DefaultSchemaOptions> & Lesson & {
    _id: Types.ObjectId;
} & {
    __v: number;
}), any, Lesson>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Lesson, Document<unknown, {}, Lesson, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Lesson & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    courseId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Lesson, Document<unknown, {}, Lesson, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Lesson & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    sectionId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Lesson, Document<unknown, {}, Lesson, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Lesson & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, Lesson, Document<unknown, {}, Lesson, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Lesson & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string, Lesson, Document<unknown, {}, Lesson, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Lesson & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    cdnVideoId?: import("mongoose").SchemaDefinitionProperty<string, Lesson, Document<unknown, {}, Lesson, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Lesson & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    duration?: import("mongoose").SchemaDefinitionProperty<number, Lesson, Document<unknown, {}, Lesson, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Lesson & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    order?: import("mongoose").SchemaDefinitionProperty<number, Lesson, Document<unknown, {}, Lesson, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Lesson & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isFree?: import("mongoose").SchemaDefinitionProperty<boolean, Lesson, Document<unknown, {}, Lesson, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Lesson & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Lesson>;
