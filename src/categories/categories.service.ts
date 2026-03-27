import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import slugify from 'slugify';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  findAll() {
    return this.categoryModel.find().sort({ name: 1 }).exec();
  }

  async create(name: string, icon?: string): Promise<CategoryDocument> {
    const slug = slugify(name, { lower: true, strict: true });
    const cat = new this.categoryModel({ name, slug, icon });
    return cat.save();
  }

  async delete(id: string): Promise<void> {
    await this.categoryModel.findByIdAndDelete(id);
  }
}
