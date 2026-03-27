import { Model, Types } from 'mongoose';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { SectionDocument } from '../courses/schemas/section.schema';
import { LessonDocument } from '../courses/schemas/lesson.schema';
import { EnrollmentDocument } from '../enrollments/schemas/enrollment.schema';
import { OrderDocument } from '../orders/schemas/order.schema';
import { CoursesService } from '../courses/courses.service';
export declare class InstructorService {
    private courseModel;
    private sectionModel;
    private lessonModel;
    private enrollmentModel;
    private orderModel;
    private coursesService;
    constructor(courseModel: Model<CourseDocument>, sectionModel: Model<SectionDocument>, lessonModel: Model<LessonDocument>, enrollmentModel: Model<EnrollmentDocument>, orderModel: Model<OrderDocument>, coursesService: CoursesService);
    getCourseById(courseId: string, instructorId: string, isAdmin?: boolean): Promise<CourseDocument>;
    getMyCourses(instructorId: string): Promise<(Course & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getMyStats(instructorId: string): Promise<{
        totalCourses: number;
        publishedCourses: number;
        totalEnrollments: number;
        totalRevenue: number;
    }>;
    getMyOrders(instructorId: string, page?: number, limit?: number): Promise<{
        orders: {
            items: {
                courseId: Types.ObjectId;
                title: string;
                price: number;
            }[];
            myRevenue: number;
            userId: Types.ObjectId;
            total: number;
            status: string;
            stripePaymentIntentId: string | null;
            stripeClientSecret: string | null;
            _id: Types.ObjectId;
            $locals: Record<string, unknown>;
            $op: "save" | "validate" | "remove" | null;
            $where: Record<string, unknown>;
            baseModelName?: string;
            collection: import("mongoose").Collection;
            db: import("mongoose").Connection;
            errors?: import("mongoose").Error.ValidationError;
            isNew: boolean;
            schema: import("mongoose").Schema;
            __v: number;
        }[];
        total: number;
        page: number;
        pages: number;
    }>;
    private assertCourseOwner;
    private assertSectionOwner;
    private assertLessonOwner;
    createSection(courseId: string, title: string, instructorId: string, isAdmin?: boolean): Promise<SectionDocument>;
    updateSection(sectionId: string, dto: any, instructorId: string, isAdmin?: boolean): Promise<SectionDocument>;
    deleteSection(sectionId: string, instructorId: string, isAdmin?: boolean): Promise<void>;
    createLesson(sectionId: string, courseId: string, dto: any, instructorId: string, isAdmin?: boolean): Promise<LessonDocument>;
    updateLesson(lessonId: string, dto: any, instructorId: string, isAdmin?: boolean): Promise<LessonDocument>;
    deleteLesson(lessonId: string, instructorId: string, isAdmin?: boolean): Promise<void>;
    togglePublish(courseId: string, instructorId: string, isAdmin?: boolean): Promise<CourseDocument>;
}
