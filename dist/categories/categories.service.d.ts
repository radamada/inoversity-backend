import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
export declare class CategoriesService {
    private categoryModel;
    constructor(categoryModel: Model<CategoryDocument>);
    findAll(): Promise<(import("mongoose").Document<unknown, {}, CategoryDocument, {}, import("mongoose").DefaultSchemaOptions> & Category & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    create(name: string, icon?: string): Promise<CategoryDocument>;
    delete(id: string): Promise<void>;
}
