import { AdminService } from './admin.service';
import { CoursesService } from '../courses/courses.service';
import { CreateCourseDto } from '../courses/dto/create-course.dto';
declare class SetRoleDto {
    role: string;
}
declare class SetActiveDto {
    isActive: boolean;
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
declare class PaginationDto {
    page?: number;
    limit?: number;
}
export declare class AdminController {
    private readonly adminService;
    private readonly coursesService;
    constructor(adminService: AdminService, coursesService: CoursesService);
    getStats(): Promise<{
        totalRevenue: any;
        totalOrders: number;
        pendingOrders: number;
        totalUsers: number;
        totalCourses: number;
        publishedCourses: number;
    }>;
    getUsers(q: PaginationDto): Promise<{
        users: (import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").UserDocument, {}, import("mongoose").DefaultSchemaOptions> & import("../users/schemas/user.schema").User & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
        total: number;
        page: number;
        pages: number;
    }>;
    setRole(id: string, dto: SetRoleDto): Promise<import("../users/schemas/user.schema").UserDocument>;
    setActive(id: string, dto: SetActiveDto): Promise<import("../users/schemas/user.schema").UserDocument>;
    getOrders(q: PaginationDto): Promise<{
        orders: (import("mongoose").Document<unknown, {}, import("../orders/schemas/order.schema").OrderDocument, {}, import("mongoose").DefaultSchemaOptions> & import("../orders/schemas/order.schema").Order & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
        total: number;
        page: number;
        pages: number;
    }>;
    refundOrder(id: string): Promise<import("../orders/schemas/order.schema").OrderDocument>;
    getAllCourses(q: PaginationDto): Promise<{
        courses: (import("mongoose").Document<unknown, {}, import("../courses/schemas/course.schema").CourseDocument, {}, import("mongoose").DefaultSchemaOptions> & import("../courses/schemas/course.schema").Course & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
        total: number;
        page: number;
        pages: number;
    }>;
    getCourse(id: string): Promise<import("../courses/schemas/course.schema").CourseDocument>;
    createCourse(dto: CreateCourseDto, user: any): Promise<import("../courses/schemas/course.schema").CourseDocument>;
    updateCourse(id: string, dto: Partial<CreateCourseDto>, user: any): Promise<import("../courses/schemas/course.schema").CourseDocument>;
    togglePublish(id: string): Promise<import("../courses/schemas/course.schema").CourseDocument>;
    deleteCourse(id: string): Promise<void>;
    createSection(courseId: string, dto: CreateSectionDto): Promise<import("../courses/schemas/section.schema").SectionDocument>;
    updateSection(id: string, dto: UpdateSectionDto): Promise<import("../courses/schemas/section.schema").SectionDocument>;
    deleteSection(id: string): Promise<void>;
    createLesson(sectionId: string, courseId: string, dto: CreateLessonDto): Promise<import("../courses/schemas/lesson.schema").LessonDocument>;
    updateLesson(id: string, dto: Partial<CreateLessonDto>): Promise<import("../courses/schemas/lesson.schema").LessonDocument>;
    deleteLesson(id: string): Promise<void>;
}
export {};
