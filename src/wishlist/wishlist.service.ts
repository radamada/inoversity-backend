import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, WishlistDocument } from './schemas/wishlist.schema';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
  ) {}

  async getMyWishlist(userId: string) {
    return this.wishlistModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'courseId',
        // Only return safe public fields; filter out unpublished courses
        match: { published: true },
        select: 'title slug thumbnail price rating reviewCount enrollmentCount level instructorId categoryId',
        populate: { path: 'instructorId', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec()
      // Filter out entries where populate returned null (unpublished/deleted courses)
      .then((items) => items.filter((item) => item.courseId !== null));
  }

  async addToWishlist(userId: string, courseId: string) {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('ID curs invalid');
    }

    try {
      await this.wishlistModel.create({
        userId: new Types.ObjectId(userId),
        courseId: new Types.ObjectId(courseId),
      });
    } catch (err: any) {
      // Duplicate key — already in wishlist, treat as success (idempotent)
      if (err?.code === 11000) return;
      throw err;
    }
  }

  async removeFromWishlist(userId: string, courseId: string) {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('ID curs invalid');
    }

    const result = await this.wishlistModel.deleteOne({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Cursul nu este în wishlist');
    }
  }

  async isInWishlist(userId: string, courseId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(courseId)) return false;
    const count = await this.wishlistModel.countDocuments({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
    });
    return count > 0;
  }

  async getWishlistCourseIds(userId: string): Promise<string[]> {
    const items = await this.wishlistModel
      .find({ userId: new Types.ObjectId(userId) })
      .select('courseId')
      .lean()
      .exec();
    return items.map((i) => i.courseId.toString());
  }
}
