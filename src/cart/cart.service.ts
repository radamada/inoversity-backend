import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { CoursesService } from '../courses/courses.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private coursesService: CoursesService,
    private enrollmentsService: EnrollmentsService,
  ) {}

  async getCart(userId: string) {
    const uid = new Types.ObjectId(userId);
    const cart = await this.cartModel
      .findOne({ userId: uid })
      .populate('items', 'title slug thumbnail price rating instructorId')
      .exec();
    return cart ?? { userId, items: [] };
  }

  async addItem(userId: string, courseId: string) {
    // Check course exists and is published
    const course = await this.coursesService.findById(courseId);
    if (!course.published) throw new BadRequestException('Cursul nu este disponibil');

    // Check not already enrolled
    const isEnrolled = await this.enrollmentsService.isEnrolled(userId, courseId);
    if (isEnrolled) throw new BadRequestException('Ești deja înscris la acest curs');

    const uid = new Types.ObjectId(userId);
    await this.cartModel.findOneAndUpdate(
      { userId: uid },
      { $addToSet: { items: new Types.ObjectId(courseId) } },
      { upsert: true, setDefaultsOnInsert: true, new: true },
    );
    return this.getCart(userId);
  }

  async removeItem(userId: string, courseId: string) {
    await this.cartModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $pull: { items: new Types.ObjectId(courseId) } },
    );
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    await this.cartModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: { items: [] } },
    );
  }

  async getCartItems(userId: string): Promise<Types.ObjectId[]> {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
    return cart?.items ?? [];
  }
}
