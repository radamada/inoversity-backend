import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { CoursesService } from '../courses/courses.service';
export declare class ReviewsService {
    private reviewModel;
    private enrollmentsService;
    private coursesService;
    constructor(reviewModel: Model<ReviewDocument>, enrollmentsService: EnrollmentsService, coursesService: CoursesService);
    getByCourse(courseId: string): Promise<(import("mongoose").Document<unknown, {}, ReviewDocument, {}, import("mongoose").DefaultSchemaOptions> & Review & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    create(userId: string, courseId: string, rating: number, comment: string): Promise<ReviewDocument>;
}
