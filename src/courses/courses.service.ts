import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slugify from 'slugify';
import { Course, CourseDocument } from './schemas/course.schema';
import { Section, SectionDocument } from './schemas/section.schema';
import { Lesson, LessonDocument } from './schemas/lesson.schema';
import { Wishlist, WishlistDocument } from '../wishlist/schemas/wishlist.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { CourseQueryDto } from './dto/course-query.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(Section.name) private sectionModel: Model<SectionDocument>,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
    private notificationsService: NotificationsService,
  ) {}

  // ── Courses ──────────────────────────────────────────────────────────────

  async findAll(query: CourseQueryDto, onlyPublished = true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (onlyPublished) filter.published = true;

    if (query.search) {
      filter.$text = { $search: query.search };
    }
    if (query.category) filter.categoryId = new Types.ObjectId(query.category);
    if (query.level) filter.level = query.level;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {};
      if (query.minPrice !== undefined) filter.price.$gte = query.minPrice;
      if (query.maxPrice !== undefined) filter.price.$lte = query.maxPrice;
    }

    let sort: any = { createdAt: -1 };
    if (query.sortBy === 'price_asc') sort = { price: 1 };
    else if (query.sortBy === 'price_desc') sort = { price: -1 };
    else if (query.sortBy === 'rating') sort = { rating: -1 };
    else if (query.sortBy === 'popular') sort = { enrollmentCount: -1 };

    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      this.courseModel
        .find(filter)
        .populate('instructorId', 'name avatar')
        .populate('categoryId', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.courseModel.countDocuments(filter),
    ]);

    return { courses, total, page, pages: Math.ceil(total / limit) };
  }

  async findBySlug(slug: string): Promise<CourseDocument> {
    const course = await this.courseModel
      .findOne({ slug, published: true })
      .populate('instructorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .exec();
    if (!course) throw new NotFoundException('Cursul nu a fost găsit');
    return course;
  }

  async findById(id: string): Promise<CourseDocument> {
    const course = await this.courseModel
      .findById(id)
      .populate('instructorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .exec();
    if (!course) throw new NotFoundException('Cursul nu a fost găsit');
    return course;
  }

  async create(dto: CreateCourseDto, instructorId: string): Promise<CourseDocument> {
    const slug = await this.generateUniqueSlug(dto.title);
    const course = new this.courseModel({
      ...dto,
      slug,
      instructorId: new Types.ObjectId(instructorId),
      categoryId: dto.categoryId ? new Types.ObjectId(dto.categoryId) : null,
    });
    return course.save();
  }

  async update(id: string, dto: Partial<CreateCourseDto>, userId: string, isAdmin = false): Promise<CourseDocument> {
    if (!isAdmin) {
      const existing = await this.courseModel.findById(id).select('instructorId').lean();
      if (!existing) throw new NotFoundException('Cursul nu a fost găsit');
      if (existing.instructorId.toString() !== userId) {
        throw new ForbiddenException('Nu ai permisiunea de a modifica acest curs');
      }
    }
    const $set: Record<string, any> = { ...dto };
    if ($set.categoryId) $set.categoryId = new Types.ObjectId($set.categoryId);
    else delete $set.categoryId;
    const updated = await this.courseModel
      .findByIdAndUpdate(id, { $set }, { new: true })
      .populate('instructorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .exec();
    if (!updated) throw new NotFoundException('Cursul nu a fost găsit');

    // Notify enrolled users about the update
    await this.notificationsService.notifyEnrolledUsers(
      id,
      'course_updated',
      `Cursul "${updated.title}" a fost actualizat`,
      `Instructorul a adus modificări cursului "${updated.title}". Intră să vezi ce s-a schimbat!`,
    );

    return updated;
  }

  async togglePublish(id: string): Promise<CourseDocument> {
    const course = await this.findById(id);
    course.published = !course.published;
    const saved = await course.save();

    // Dacă tocmai a fost scos din publicare, curăță toate wishlist-urile
    if (!saved.published) {
      await this.wishlistModel.deleteMany({ courseId: saved._id });
    }

    return saved;
  }

  async delete(id: string): Promise<void> {
    const course = await this.findById(id);
    await this.sectionModel.deleteMany({ courseId: course._id });
    await this.lessonModel.deleteMany({ courseId: course._id });
    await this.wishlistModel.deleteMany({ courseId: course._id });
    await course.deleteOne();
  }

  // ── Sections ─────────────────────────────────────────────────────────────

  async getSections(courseId: string) {
    return this.sectionModel.find({ courseId }).sort({ order: 1 }).exec();
  }

  async createSection(courseId: string, title: string): Promise<SectionDocument> {
    const count = await this.sectionModel.countDocuments({ courseId });
    const section = new this.sectionModel({
      courseId: new Types.ObjectId(courseId),
      title,
      order: count,
    });
    return section.save();
  }

  async updateSection(sectionId: string, data: { title?: string; order?: number }): Promise<SectionDocument> {
    const section = await this.sectionModel.findByIdAndUpdate(sectionId, { $set: data }, { new: true });
    if (!section) throw new NotFoundException('Secțiunea nu a fost găsită');
    return section;
  }

  async deleteSection(sectionId: string): Promise<void> {
    await this.lessonModel.deleteMany({ sectionId });
    await this.sectionModel.findByIdAndDelete(sectionId);
  }

  // ── Lessons ───────────────────────────────────────────────────────────────

  async getLessons(courseId: string) {
    return this.lessonModel.find({ courseId }).sort({ sectionId: 1, order: 1 }).exec();
  }

  async createLesson(sectionId: string, courseId: string, data: Partial<Lesson>): Promise<LessonDocument> {
    const count = await this.lessonModel.countDocuments({ sectionId });
    const lesson = new this.lessonModel({
      ...data,
      courseId: new Types.ObjectId(courseId),
      sectionId: new Types.ObjectId(sectionId),
      order: count,
    });
    const saved = await lesson.save();

    // Notify enrolled users about the new lesson
    const course = await this.courseModel.findById(courseId).select('title').lean();
    if (course) {
      await this.notificationsService.notifyEnrolledUsers(
        courseId,
        'course_updated',
        `Lecție nouă în "${course.title}"`,
        `O lecție nouă${data.title ? ` — "${data.title}"` : ''} a fost adăugată la cursul "${course.title}". Continuă să înveți!`,
      );
    }

    return saved;
  }

  async updateLesson(lessonId: string, data: Partial<Lesson>): Promise<LessonDocument> {
    const lesson = await this.lessonModel.findByIdAndUpdate(lessonId, { $set: data }, { new: true });
    if (!lesson) throw new NotFoundException('Lecția nu a fost găsită');
    return lesson;
  }

  async deleteLesson(lessonId: string): Promise<void> {
    await this.lessonModel.findByIdAndDelete(lessonId);
  }

  async getCurriculum(courseId: string) {
    const cid = new Types.ObjectId(courseId);
    const sections = await this.sectionModel
      .find({ courseId: cid })
      .sort({ order: 1 })
      .lean()
      .exec();

    const lessons = await this.lessonModel
      .find({ courseId: cid })
      .sort({ order: 1 })
      .lean()
      .exec();

    return sections.map((section) => ({
      ...section,
      lessons: lessons.filter(
        (l) => l.sectionId.toString() === (section as any)._id.toString(),
      ),
    }));
  }

  async updateRating(courseId: string): Promise<void> {
    // Called after review is created/updated
    const Review = (this.courseModel.db as any).model('Review');
    const result = await Review.aggregate([
      { $match: { courseId: new Types.ObjectId(courseId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (result.length > 0) {
      await this.courseModel.findByIdAndUpdate(courseId, {
        rating: Math.round(result[0].avg * 10) / 10,
        reviewCount: result[0].count,
      });
    }
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title, { lower: true, strict: true });
    let slug = base;
    let i = 1;
    while (await this.courseModel.findOne({ slug })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }
}
