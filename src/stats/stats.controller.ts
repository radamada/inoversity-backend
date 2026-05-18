import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { AppCacheService } from '../common/cache/app-cache.service';
import { CACHE_TTL_MS } from '../common/constants/timings';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  private readonly CACHE_KEY = 'stats:public';

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    private appCache: AppCacheService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Statistici publice platformă' })
  async getStats() {
    const cached = await this.appCache.get(this.CACHE_KEY);
    if (cached) return cached;

    const [courses, students, instructors] = await Promise.all([
      this.courseModel.countDocuments({ published: true }),
      this.userModel.countDocuments({ role: 'student' }),
      this.userModel.countDocuments({ role: 'instructor' }),
    ]);
    const stats = { courses, students, instructors };
    await this.appCache.set(this.CACHE_KEY, stats, CACHE_TTL_MS.STATS);
    return stats;
  }
}
