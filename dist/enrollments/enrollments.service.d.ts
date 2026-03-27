import { Model, Types } from 'mongoose';
import { Enrollment, EnrollmentDocument } from './schemas/enrollment.schema';
import { LessonDocument } from '../courses/schemas/lesson.schema';
import { CourseDocument } from '../courses/schemas/course.schema';
export declare class EnrollmentsService {
    private enrollmentModel;
    private lessonModel;
    private courseModel;
    constructor(enrollmentModel: Model<EnrollmentDocument>, lessonModel: Model<LessonDocument>, courseModel: Model<CourseDocument>);
    enroll(userId: string, courseId: string, orderId: string): Promise<EnrollmentDocument>;
    isEnrolled(userId: string, courseId: string): Promise<boolean>;
    revokeEnrollments(userId: string, courseIds: string[]): Promise<void>;
    getMyEnrollments(userId: string): Promise<(import("mongoose").Document<unknown, {}, EnrollmentDocument, {}, import("mongoose").DefaultSchemaOptions> & Enrollment & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    getProgress(userId: string, courseId: string): Promise<import("mongoose").Document<unknown, {}, EnrollmentDocument, {}, import("mongoose").DefaultSchemaOptions> & Enrollment & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    markLessonComplete(userId: string, courseId: string, lessonId: string): Promise<import("mongoose").Document<unknown, {}, EnrollmentDocument, {}, import("mongoose").DefaultSchemaOptions> & Enrollment & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    countByCourse(courseId: string): Promise<number>;
    findAll(page?: number, limit?: number): Promise<{
        enrollments: (import("mongoose").Document<unknown, {}, EnrollmentDocument, {}, import("mongoose").DefaultSchemaOptions> & Enrollment & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
        total: number;
        page: number;
        pages: number;
    }>;
}
