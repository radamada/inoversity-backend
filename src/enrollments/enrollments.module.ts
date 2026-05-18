import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController, CertificatesController } from './enrollments.controller';
import { Enrollment, EnrollmentSchema } from './schemas/enrollment.schema';
import { Lesson, LessonSchema } from '../courses/schemas/lesson.schema';
import { Course, CourseSchema } from '../courses/schemas/course.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: Course.name, schema: CourseSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [EnrollmentsService],
  controllers: [EnrollmentsController, CertificatesController],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
