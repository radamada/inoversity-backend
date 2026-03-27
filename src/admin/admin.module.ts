import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Course, CourseSchema } from '../courses/schemas/course.schema';
import { UsersModule } from '../users/users.module';
import { OrdersModule } from '../orders/orders.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
    UsersModule,
    OrdersModule,
    EnrollmentsModule,
    CoursesModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
