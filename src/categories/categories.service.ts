import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import slugify from 'slugify';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { AppCacheService } from '../common/cache/app-cache.service';
import { CACHE_TTL_MS } from '../common/constants/timings';

@Injectable()
export class CategoriesService {
  private readonly CACHE_KEY = 'categories:all';

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    private appCache: AppCacheService,
  ) {}

  async findAll() {
    const cached = await this.appCache.get<CategoryDocument[]>(this.CACHE_KEY);
    if (cached) return cached;

    const categories = await this.categoryModel.find().sort({ name: 1 }).exec();
    await this.appCache.set(this.CACHE_KEY, categories, CACHE_TTL_MS.CATEGORIES);
    return categories;
  }

  async create(name: string, icon?: string): Promise<CategoryDocument> {
    const slug = slugify(name, { lower: true, strict: true });
    const cat = new this.categoryModel({ name, slug, icon });
    const saved = await cat.save();
    await this.appCache.del(this.CACHE_KEY);
    return saved;
  }

  async delete(id: string): Promise<void> {
    await this.categoryModel.findByIdAndDelete(id);
    // Remove the deleted category reference from all courses that still reference it
    await this.courseModel.updateMany(
      { categoryId: id },
      { $unset: { categoryId: '' } },
    );
    await this.appCache.del(this.CACHE_KEY);
  }
}
