import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course, CourseSchema } from './schemas/course.schema';
import { Section, SectionSchema } from './schemas/section.schema';
import { Lesson, LessonSchema } from './schemas/lesson.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Section.name, schema: SectionSchema },
      { name: Lesson.name, schema: LessonSchema },
    ]),
    NotificationsModule,
  ],
  providers: [CoursesService],
  controllers: [CoursesController],
  exports: [CoursesService],
})
export class CoursesModule {}
