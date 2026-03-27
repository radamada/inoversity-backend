import { Document, Types } from 'mongoose';
export type CourseDocument = Course & Document;
export declare class Course {
    title: string;
    slug: string;
    description: string;
    thumbnail: string;
    instructorId: Types.ObjectId;
    price: number;
    categoryId: Types.ObjectId | null;
    tags: string[];
    published: boolean;
    rating: number;
    reviewCount: number;
    enrollmentCount: number;
    whatYouLearn: string[];
    requirements: string[];
    level: string;
    language: string;
}
export declare const CourseSchema: import("mongoose").Schema<Course, import("mongoose").Model<Course, any, any, any, (Document<unknown, any, Course, any, import("mongoose").DefaultSchemaOptions> & Course & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Course, any, import("mongoose").DefaultSchemaOptions> & Course & {
    _id: Types.ObjectId;
} & {
    __v: number;
}), any, Course>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Course, Document<unknown, {}, Course, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    title?: import("mongoose").SchemaDefinitionProperty<string, Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    slug?: import("mongoose").SchemaDefinitionProperty<string, Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string, Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    thumbnail?: import("mongoose").SchemaDefinitionProperty<string, Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    instructorId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    price?: import("mongoose").SchemaDefinitionProperty<number, Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    categoryId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null, Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    tags?: import("mongoose").SchemaDefinitionProperty<string[], Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    published?: import("mongoose").SchemaDefinitionProperty<boolean, Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    rating?: import("mongoose").SchemaDefinitionProperty<number, Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    reviewCount?: import("mongoose").SchemaDefinitionProperty<number, Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    enrollmentCount?: import("mongoose").SchemaDefinitionProperty<number, Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    whatYouLearn?: import("mongoose").SchemaDefinitionProperty<string[], Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    requirements?: import("mongoose").SchemaDefinitionProperty<string[], Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    level?: import("mongoose").SchemaDefinitionProperty<string, Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    language?: import("mongoose").SchemaDefinitionProperty<string, Course, Document<unknown, {}, Course, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Course & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Course>;
