import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import { Enrollment, EnrollmentSchema } from './schemas/enrollment.schema';
import { Lesson, LessonSchema } from '../courses/schemas/lesson.schema';
import { Course, CourseSchema } from '../courses/schemas/course.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
  ],
  providers: [EnrollmentsService],
  controllers: [EnrollmentsController],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
