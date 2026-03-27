import { EnrollmentsService } from './enrollments.service';
export declare class EnrollmentsController {
    private readonly enrollmentsService;
    constructor(enrollmentsService: EnrollmentsService);
    getMyEnrollments(user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/enrollment.schema").EnrollmentDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/enrollment.schema").Enrollment & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    getProgress(user: any, courseId: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/enrollment.schema").EnrollmentDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/enrollment.schema").Enrollment & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    markLesson(user: any, courseId: string, lessonId: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/enrollment.schema").EnrollmentDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/enrollment.schema").Enrollment & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
}
