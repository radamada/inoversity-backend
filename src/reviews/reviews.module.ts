import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Review, ReviewSchema } from './schemas/review.schema';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Review.name, schema: ReviewSchema }]),
    EnrollmentsModule,
    CoursesModule,
  ],
  providers: [ReviewsService],
  controllers: [ReviewsController],
})
export class ReviewsModule {}
