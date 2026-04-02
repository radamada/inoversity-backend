import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Course, CourseSchema } from '../courses/schemas/course.schema';
import { Enrollment, EnrollmentSchema } from '../enrollments/schemas/enrollment.schema';
import { UsersModule } from '../users/users.module';
import { OrdersModule } from '../orders/orders.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { CoursesModule } from '../courses/courses.module';
import { InstructorModule } from '../instructor/instructor.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
    ]),
    UsersModule,
    OrdersModule,
    EnrollmentsModule,
    CoursesModule,
    InstructorModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
