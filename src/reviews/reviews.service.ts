import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { CoursesService } from '../courses/courses.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    private enrollmentsService: EnrollmentsService,
    private coursesService: CoursesService,
  ) {}

  async getByCourse(courseId: string, page = 1, limit = 20) {
    const skip = (page - 1) * Math.min(limit, 50);
    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ courseId: new Types.ObjectId(courseId) })
        .populate('userId', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(limit, 50))
        .exec(),
      this.reviewModel.countDocuments({ courseId: new Types.ObjectId(courseId) }),
    ]);
    return { reviews, total, page, pages: Math.ceil(total / Math.min(limit, 50)) };
  }

  async create(userId: string, courseId: string, rating: number, comment: string) {
    const isEnrolled = await this.enrollmentsService.isEnrolled(userId, courseId);
    if (!isEnrolled) {
      throw new BadRequestException('Trebuie să fii înscris pentru a lăsa o recenzie');
    }

    // Atomic upsert — eliminates race condition where two concurrent requests
    // both pass the findOne check and both try to create a review.
    // { upsert: true, new: true } guarantees exactly one document regardless of concurrency.
    const review = await this.reviewModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        courseId: new Types.ObjectId(courseId),
      },
      { $set: { rating, comment } },
      { upsert: true, new: true },
    );

    // Update course rating — fire-and-forget is acceptable here;
    // rating is eventually consistent and recalculated from all reviews.
    this.coursesService.updateRating(courseId).catch(() => {});

    return review;
  }

  /**
   * Admin-only review removal. Recalculates the course's aggregate rating
   * after deletion — without this, the course rating/reviewCount would stay
   * stale when an admin removes an abusive or off-topic review.
   */
  async deleteAsAdmin(reviewId: string): Promise<void> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('ID invalid');
    }
    const review = await this.reviewModel.findByIdAndDelete(reviewId);
    if (!review) throw new NotFoundException('Recenzia nu a fost găsită');
    await this.coursesService.updateRating(review.courseId.toString()).catch(() => {});
  }
}
