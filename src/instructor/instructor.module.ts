import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InstructorController } from './instructor.controller';
import { InstructorService } from './instructor.service';
import { Course, CourseSchema } from '../courses/schemas/course.schema';
import { Section, SectionSchema } from '../courses/schemas/section.schema';
import { Lesson, LessonSchema } from '../courses/schemas/lesson.schema';
import { Enrollment, EnrollmentSchema } from '../enrollments/schemas/enrollment.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { CoursesModule } from '../courses/courses.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Section.name, schema: SectionSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    CoursesModule,
    CouponsModule,
  ],
  controllers: [InstructorController],
  providers: [InstructorService],
  exports: [InstructorService],
})
export class InstructorModule {}
