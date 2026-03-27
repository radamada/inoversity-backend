import { Model } from 'mongoose';
import { UserDocument } from '../users/schemas/user.schema';
import { CourseDocument } from '../courses/schemas/course.schema';
export declare class StatsController {
    private userModel;
    private courseModel;
    constructor(userModel: Model<UserDocument>, courseModel: Model<CourseDocument>);
    getStats(): Promise<{
        courses: number;
        students: number;
        instructors: number;
    }>;
}
