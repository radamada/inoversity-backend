import { ReviewsService } from './reviews.service';
declare class CreateReviewDto {
    rating: number;
    comment?: string;
}
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    getByCourse(courseId: string): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/review.schema").ReviewDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/review.schema").Review & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    create(courseId: string, user: any, dto: CreateReviewDto): Promise<import("./schemas/review.schema").ReviewDocument>;
}
export {};
