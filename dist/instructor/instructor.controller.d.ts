import { InstructorService } from './instructor.service';
import { CoursesService } from '../courses/courses.service';
import { CreateCourseDto } from '../courses/dto/create-course.dto';
declare class PaginationDto {
    page?: number;
    limit?: number;
}
declare class CreateSectionDto {
    title: string;
}
declare class UpdateSectionDto {
    title?: string;
    order?: number;
}
declare class CreateLessonDto {
    title: string;
    description?: string;
    cdnVideoId?: string;
    duration?: number;
    isFree?: boolean;
}
export declare class InstructorController {
    private readonly instructorService;
    private readonly coursesService;
    constructor(instructorService: InstructorService, coursesService: CoursesService);
    getStats(user: any): Promise<{
        totalCourses: number;
        publishedCourses: number;
        totalEnrollments: number;
        totalRevenue: number;
    }>;
    getMyCourses(user: any): Promise<(import("../courses/schemas/course.schema").Course & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getCourse(id: string, user: any): Promise<import("../courses/schemas/course.schema").CourseDocument>;
    createCourse(dto: CreateCourseDto, user: any): Promise<import("../courses/schemas/course.schema").CourseDocument>;
    updateCourse(id: string, dto: Partial<CreateCourseDto>, user: any): Promise<import("../courses/schemas/course.schema").CourseDocument>;
    togglePublish(id: string, user: any): Promise<import("../courses/schemas/course.schema").CourseDocument>;
    getMyOrders(q: PaginationDto, user: any): Promise<{
        orders: {
            items: {
                courseId: import("mongoose").Types.ObjectId;
                title: string;
                price: number;
            }[];
            myRevenue: number;
            userId: import("mongoose").Types.ObjectId;
            total: number;
            status: string;
            stripePaymentIntentId: string | null;
            stripeClientSecret: string | null;
            _id: import("mongoose").Types.ObjectId;
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
    createSection(courseId: string, dto: CreateSectionDto, user: any): Promise<import("../courses/schemas/section.schema").SectionDocument>;
    updateSection(id: string, dto: UpdateSectionDto, user: any): Promise<import("../courses/schemas/section.schema").SectionDocument>;
    deleteSection(id: string, user: any): Promise<void>;
    createLesson(sectionId: string, courseId: string, dto: CreateLessonDto, user: any): Promise<import("../courses/schemas/lesson.schema").LessonDocument>;
    updateLesson(id: string, dto: Partial<CreateLessonDto>, user: any): Promise<import("../courses/schemas/lesson.schema").LessonDocument>;
    deleteLesson(id: string, user: any): Promise<void>;
}
export {};
