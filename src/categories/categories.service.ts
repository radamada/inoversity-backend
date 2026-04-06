import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import slugify from 'slugify';
import { Category, CategoryDocument } from './schemas/category.schema';
import { AppCacheService } from '../common/cache/app-cache.service';

@Injectable()
export class CategoriesService {
  private readonly CACHE_KEY = 'categories:all';

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    private appCache: AppCacheService,
  ) {}

  async findAll() {
    const cached = await this.appCache.get<CategoryDocument[]>(this.CACHE_KEY);
    if (cached) return cached;

    const categories = await this.categoryModel.find().sort({ name: 1 }).exec();
    await this.appCache.set(this.CACHE_KEY, categories, 3_600_000); // 1 hour
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
    await this.appCache.del(this.CACHE_KEY);
  }
}
