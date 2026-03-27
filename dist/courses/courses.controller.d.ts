import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CourseQueryDto } from './dto/course-query.dto';
export declare class CoursesController {
    private readonly coursesService;
    constructor(coursesService: CoursesService);
    findAll(query: CourseQueryDto): Promise<{
        courses: (import("mongoose").Document<unknown, {}, import("./schemas/course.schema").CourseDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/course.schema").Course & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
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
    findOne(slug: string): Promise<import("./schemas/course.schema").CourseDocument>;
    getCurriculum(id: string): Promise<{
        lessons: (import("./schemas/lesson.schema").Lesson & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        courseId: import("mongoose").Types.ObjectId;
        title: string;
        order: number;
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
    }[]>;
    create(dto: CreateCourseDto, user: any): Promise<import("./schemas/course.schema").CourseDocument>;
    update(id: string, dto: Partial<CreateCourseDto>, user: any): Promise<import("./schemas/course.schema").CourseDocument>;
    delete(id: string): Promise<void>;
}
