import { Document, Types } from 'mongoose';
export type SectionDocument = Section & Document;
export declare class Section {
    courseId: Types.ObjectId;
    title: string;
    order: number;
}
export declare const SectionSchema: import("mongoose").Schema<Section, import("mongoose").Model<Section, any, any, any, (Document<unknown, any, Section, any, import("mongoose").DefaultSchemaOptions> & Section & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Section, any, import("mongoose").DefaultSchemaOptions> & Section & {
    _id: Types.ObjectId;
} & {
    __v: number;
}), any, Section>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Section, Document<unknown, {}, Section, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Section & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    courseId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Section, Document<unknown, {}, Section, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Section & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, Section, Document<unknown, {}, Section, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Section & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    order?: import("mongoose").SchemaDefinitionProperty<number, Section, Document<unknown, {}, Section, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Section & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Section>;
