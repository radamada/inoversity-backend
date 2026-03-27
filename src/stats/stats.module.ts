import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatsController } from './stats.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Course, CourseSchema } from '../courses/schemas/course.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
  ],
  controllers: [StatsController],
})
export class StatsModule {}
