import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course, CourseSchema } from './schemas/course.schema';
import { Section, SectionSchema } from './schemas/section.schema';
import { Lesson, LessonSchema } from './schemas/lesson.schema';
import { Wishlist, WishlistSchema } from '../wishlist/schemas/wishlist.schema';
import { Enrollment, EnrollmentSchema } from '../enrollments/schemas/enrollment.schema';
import { Review, ReviewSchema } from '../reviews/schemas/review.schema';
import { Cart, CartSchema } from '../cart/schemas/cart.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { MediaModule } from '../media/media.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  imports: [
    MediaModule,
    EnrollmentsModule,
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Section.name, schema: SectionSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: Wishlist.name, schema: WishlistSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    NotificationsModule,
  ],
  providers: [CoursesService],
  controllers: [CoursesController],
  exports: [CoursesService],
})
export class CoursesModule {}
