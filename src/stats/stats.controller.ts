import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Statistici publice platformă' })
  async getStats() {
    const [courses, students, instructors] = await Promise.all([
      this.courseModel.countDocuments({ published: true }),
      this.userModel.countDocuments({ role: 'student' }),
      this.userModel.countDocuments({ role: 'instructor' }),
    ]);
    return { courses, students, instructors };
  }
}
