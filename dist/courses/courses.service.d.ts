import { Model, Types } from 'mongoose';
import { Course, CourseDocument } from './schemas/course.schema';
import { Section, SectionDocument } from './schemas/section.schema';
import { Lesson, LessonDocument } from './schemas/lesson.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { CourseQueryDto } from './dto/course-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
export declare class CoursesService {
    private courseModel;
    private sectionModel;
    private lessonModel;
    private notificationsService;
    constructor(courseModel: Model<CourseDocument>, sectionModel: Model<SectionDocument>, lessonModel: Model<LessonDocument>, notificationsService: NotificationsService);
    findAll(query: CourseQueryDto, onlyPublished?: boolean): Promise<{
        courses: (import("mongoose").Document<unknown, {}, CourseDocument, {}, import("mongoose").DefaultSchemaOptions> & Course & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
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
    findBySlug(slug: string): Promise<CourseDocument>;
    findById(id: string): Promise<CourseDocument>;
    create(dto: CreateCourseDto, instructorId: string): Promise<CourseDocument>;
    update(id: string, dto: Partial<CreateCourseDto>, userId: string, isAdmin?: boolean): Promise<CourseDocument>;
    togglePublish(id: string): Promise<CourseDocument>;
    delete(id: string): Promise<void>;
    getSections(courseId: string): Promise<(import("mongoose").Document<unknown, {}, SectionDocument, {}, import("mongoose").DefaultSchemaOptions> & Section & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    createSection(courseId: string, title: string): Promise<SectionDocument>;
    updateSection(sectionId: string, data: {
        title?: string;
        order?: number;
    }): Promise<SectionDocument>;
    deleteSection(sectionId: string): Promise<void>;
    getLessons(courseId: string): Promise<(import("mongoose").Document<unknown, {}, LessonDocument, {}, import("mongoose").DefaultSchemaOptions> & Lesson & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    createLesson(sectionId: string, courseId: string, data: Partial<Lesson>): Promise<LessonDocument>;
    updateLesson(lessonId: string, data: Partial<Lesson>): Promise<LessonDocument>;
    deleteLesson(lessonId: string): Promise<void>;
    getCurriculum(courseId: string): Promise<{
        lessons: (Lesson & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        courseId: Types.ObjectId;
        title: string;
        order: number;
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
    }[]>;
    updateRating(courseId: string): Promise<void>;
    private generateUniqueSlug;
}
