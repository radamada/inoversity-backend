import { CategoriesService } from './categories.service';
declare class CreateCategoryDto {
    name: string;
    icon?: string;
}
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/category.schema").CategoryDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/category.schema").Category & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    create(dto: CreateCategoryDto): Promise<import("./schemas/category.schema").CategoryDocument>;
    delete(id: string): Promise<void>;
}
export {};
