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

  async getByCourse(courseId: string) {
    return this.reviewModel
      .find({ courseId: new Types.ObjectId(courseId) })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async create(userId: string, courseId: string, rating: number, comment: string) {
    const isEnrolled = await this.enrollmentsService.isEnrolled(userId, courseId);
    if (!isEnrolled) {
      throw new BadRequestException('Trebuie să fii înscris pentru a lăsa o recenzie');
    }

    const existing = await this.reviewModel.findOne({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
    });

    let review: ReviewDocument;
    if (existing) {
      existing.rating = rating;
      existing.comment = comment;
      review = await existing.save();
    } else {
      review = await new this.reviewModel({
        userId: new Types.ObjectId(userId),
        courseId: new Types.ObjectId(courseId),
        rating,
        comment,
      }).save();
    }

    // Update course rating
    await this.coursesService.updateRating(courseId);
    return review;
  }
}
