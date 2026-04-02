import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slugify from 'slugify';
import { Course, CourseDocument } from './schemas/course.schema';
import { Section, SectionDocument } from './schemas/section.schema';
import { Lesson, LessonDocument } from './schemas/lesson.schema';
import { Wishlist, WishlistDocument } from '../wishlist/schemas/wishlist.schema';
import { Enrollment, EnrollmentDocument } from '../enrollments/schemas/enrollment.schema';
import { Review, ReviewDocument } from '../reviews/schemas/review.schema';
import { Cart, CartDocument } from '../cart/schemas/cart.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
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
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private notificationsService: NotificationsService,
  ) {}

  // ── Courses ──────────────────────────────────────────────────────────────

  async findAll(query: CourseQueryDto, onlyPublished = true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (onlyPublished) filter.published = true;

    if (query.search) {
      const pattern = buildDiacriticPattern(query.search);
      filter.$or = [
        { title: { $regex: pattern, $options: 'i' } },
        { description: { $regex: pattern, $options: 'i' } },
        { tags: { $regex: pattern, $options: 'i' } },
      ];
    }
    if (query.instructorId) filter.instructorId = new Types.ObjectId(query.instructorId);
    if (query.category) filter.categoryId = new Types.ObjectId(query.category);
    if (query.level) filter.level = query.level;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {};
      if (query.minPrice !== undefined) filter.price.$gte = query.minPrice;
      if (query.maxPrice !== undefined) filter.price.$lte = query.maxPrice;
    }
    if (query.minRating !== undefined) {
      filter.rating = { $gte: query.minRating };
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
    const existing = await this.courseModel.findById(id).select('instructorId published').lean();
    if (!existing) throw new NotFoundException('Cursul nu a fost găsit');

    if (!isAdmin && existing.instructorId.toString() !== userId) {
      throw new ForbiddenException('Nu ai permisiunea de a modifica acest curs');
    }

    const changes: Record<string, any> = { ...dto };
    if (changes.categoryId) changes.categoryId = new Types.ObjectId(changes.categoryId);
    else delete changes.categoryId;

    // If the course is published, merge changes into pendingChanges (preserve existing curriculum draft)
    if (existing.published) {
      const existingDoc = await this.courseModel.findById(id).select('pendingChanges').lean();
      const existingPending = (existingDoc?.pendingChanges as Record<string, any>) ?? {};
      const updated = await this.courseModel
        .findByIdAndUpdate(id, { $set: { pendingChanges: { ...existingPending, ...changes } } }, { new: true })
        .populate('instructorId', 'name avatar')
        .populate('categoryId', 'name slug')
        .exec();
      if (!updated) throw new NotFoundException('Cursul nu a fost găsit');
      return updated;
    }

    // Draft course → apply directly
    const updated = await this.courseModel
      .findByIdAndUpdate(id, { $set: changes }, { new: true })
      .populate('instructorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .exec();
    if (!updated) throw new NotFoundException('Cursul nu a fost găsit');
    return updated;
  }

  async savePendingCurriculum(
    id: string,
    curriculum: Array<{
      sectionId: string | null;
      title: string;
      lessons: Array<{
        lessonId: string | null;
        title: string;
        cdnVideoId: string;
        duration: number;
        isFree: boolean;
      }>;
    }>,
    userId: string,
    isAdmin = false,
  ): Promise<CourseDocument> {
    const existing = await this.courseModel.findById(id).select('instructorId published pendingChanges').lean();
    if (!existing) throw new NotFoundException('Cursul nu a fost găsit');
    if (!isAdmin && existing.instructorId.toString() !== userId) {
      throw new ForbiddenException('Nu ai permisiunea de a modifica acest curs');
    }
    if (!existing.published) {
      throw new BadRequestException('Acest endpoint este doar pentru cursuri publicate');
    }
    const existingPending = (existing.pendingChanges as Record<string, any>) ?? {};
    const updated = await this.courseModel
      .findByIdAndUpdate(
        id,
        { $set: { pendingChanges: { ...existingPending, curriculum } } },
        { new: true },
      )
      .populate('instructorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .exec();
    if (!updated) throw new NotFoundException('Cursul nu a fost găsit');
    return updated;
  }

  async publishPendingChanges(id: string, userId: string, isAdmin = false): Promise<CourseDocument> {
    const course = await this.courseModel.findById(id).select('instructorId pendingChanges title').lean();
    if (!course) throw new NotFoundException('Cursul nu a fost găsit');
    if (!isAdmin && course.instructorId.toString() !== userId) {
      throw new ForbiddenException('Nu ai permisiunea de a modifica acest curs');
    }
    if (!course.pendingChanges) throw new BadRequestException('Nu există modificări în așteptare');

    const { curriculum, ...courseFields } = course.pendingChanges as Record<string, any>;

    // Apply curriculum changes if present
    if (curriculum && Array.isArray(curriculum)) {
      await this.applyCurriculumChanges(id, curriculum);
    }

    // Apply course metadata fields (exclude curriculum key)
    const updated = await this.courseModel
      .findByIdAndUpdate(
        id,
        { $set: courseFields, $unset: { pendingChanges: '' } },
        { new: true },
      )
      .populate('instructorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .exec();
    if (!updated) throw new NotFoundException('Cursul nu a fost găsit');

    // Notify enrolled users only after the new version is live
    await this.notificationsService.notifyEnrolledUsers(
      id,
      'course_updated',
      `Cursul "${updated.title}" a fost actualizat`,
      `Instructorul a adus modificări cursului "${updated.title}". Intră să vezi ce s-a schimbat!`,
    );

    return updated;
  }

  private async applyCurriculumChanges(
    courseId: string,
    pendingSections: Array<{
      sectionId: string | null;
      title: string;
      lessons: Array<{
        lessonId: string | null;
        title: string;
        cdnVideoId: string;
        duration: number;
        isFree: boolean;
      }>;
    }>,
  ): Promise<void> {
    const cid = new Types.ObjectId(courseId);

    // Find existing section IDs for this course
    const existingSections = await this.sectionModel.find({ courseId: cid }).select('_id').lean();
    const existingSectionIds = existingSections.map((s) => s._id.toString());
    const pendingSectionIds = pendingSections.filter((s) => s.sectionId).map((s) => s.sectionId!);

    // Delete sections removed from the pending curriculum
    const sectionsToDelete = existingSectionIds.filter((sid) => !pendingSectionIds.includes(sid));
    if (sectionsToDelete.length) {
      await this.lessonModel.deleteMany({ sectionId: { $in: sectionsToDelete.map((sid) => new Types.ObjectId(sid)) } });
      await this.sectionModel.deleteMany({ _id: { $in: sectionsToDelete.map((sid) => new Types.ObjectId(sid)) } });
    }

    // Create / update sections in order
    for (let i = 0; i < pendingSections.length; i++) {
      const ps = pendingSections[i];
      let sectionDbId: string;

      if (ps.sectionId) {
        await this.sectionModel.findByIdAndUpdate(ps.sectionId, { title: ps.title, order: i });
        sectionDbId = ps.sectionId;
      } else {
        const newSection = new this.sectionModel({ courseId: cid, title: ps.title, order: i });
        await newSection.save();
        sectionDbId = (newSection._id as Types.ObjectId).toString();
      }

      // Sync lessons for this section
      const existingLessons = await this.lessonModel
        .find({ sectionId: new Types.ObjectId(sectionDbId) })
        .select('_id')
        .lean();
      const existingLessonIds = existingLessons.map((l) => l._id.toString());
      const pendingLessonIds = ps.lessons.filter((l) => l.lessonId).map((l) => l.lessonId!);

      const lessonsToDelete = existingLessonIds.filter((lid) => !pendingLessonIds.includes(lid));
      if (lessonsToDelete.length) {
        await this.lessonModel.deleteMany({ _id: { $in: lessonsToDelete.map((lid) => new Types.ObjectId(lid)) } });
      }

      for (let j = 0; j < ps.lessons.length; j++) {
        const pl = ps.lessons[j];
        if (pl.lessonId) {
          await this.lessonModel.findByIdAndUpdate(pl.lessonId, {
            title: pl.title,
            cdnVideoId: pl.cdnVideoId,
            duration: pl.duration,
            isFree: pl.isFree,
            order: j,
          });
        } else {
          await new this.lessonModel({
            courseId: cid,
            sectionId: new Types.ObjectId(sectionDbId),
            title: pl.title,
            cdnVideoId: pl.cdnVideoId,
            duration: pl.duration,
            isFree: pl.isFree,
            order: j,
          }).save();
        }
      }
    }
  }

  async discardPendingChanges(id: string, userId: string, isAdmin = false): Promise<CourseDocument> {
    const course = await this.courseModel.findById(id).select('instructorId').lean();
    if (!course) throw new NotFoundException('Cursul nu a fost găsit');
    if (!isAdmin && course.instructorId.toString() !== userId) {
      throw new ForbiddenException('Nu ai permisiunea de a modifica acest curs');
    }
    const updated = await this.courseModel
      .findByIdAndUpdate(id, { $unset: { pendingChanges: '' } }, { new: true })
      .populate('instructorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .exec();
    if (!updated) throw new NotFoundException('Cursul nu a fost găsit');
    return updated;
  }

  async togglePublish(id: string): Promise<CourseDocument> {
    const course = await this.findById(id);
    course.published = !course.published;
    const saved = await course.save();

    // Dacă tocmai a fost scos din publicare, notifică și curăță wishlist-urile
    if (!saved.published) {
      await this.cleanWishlistAndNotify(saved._id.toString(), saved.title);
    }

    return saved;
  }

  async getAlsoBought(courseId: string, limit = 4): Promise<CourseDocument[]> {
    const objId = new Types.ObjectId(courseId);

    const result = await this.orderModel.aggregate([
      { $match: { status: 'paid', 'items.courseId': objId } },
      { $unwind: '$items' },
      { $match: { 'items.courseId': { $ne: objId } } },
      { $group: { _id: '$items.courseId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    const ids = result.map((r) => r._id);
    if (!ids.length) return [];

    return this.courseModel
      .find({ _id: { $in: ids }, published: true })
      .select('title slug thumbnail price rating reviewCount instructorId')
      .populate('instructorId', 'name')
      .lean() as any;
  }

  async delete(id: string): Promise<void> {
    const course = await this.courseModel
      .findById(id)
      .select('_id title instructorId')
      .lean();
    if (!course) throw new NotFoundException('Cursul nu a fost găsit');

    const courseId = course._id;

    // Faza 1: notificări (înainte de ștergere, avem nevoie de datele existente)
    await Promise.all([
      this.cleanWishlistAndNotify(courseId.toString(), course.title),
      this.notificationsService.notifyEnrolledUsers(
        courseId.toString(),
        'course_deleted',
        'Curs indisponibil',
        `Cursul „${course.title}" la care ești înscris nu mai este disponibil pe platformă.`,
      ),
    ]);

    // Faza 2: ștergere bulk din toate colecțiile
    await Promise.all([
      this.enrollmentModel.deleteMany({ courseId }),
      this.reviewModel.deleteMany({ courseId }),
      this.cartModel.updateMany({ items: courseId }, { $pull: { items: courseId } }),
      this.sectionModel.deleteMany({ courseId }),
      this.lessonModel.deleteMany({ courseId }),
    ]);

    // Notifică instructorul că cursul lui a fost șters
    if (course.instructorId) {
      await this.notificationsService.create(
        course.instructorId.toString(),
        'course_deleted',
        'Cursul tău a fost șters',
        `Cursul „${course.title}" a fost eliminat de pe platformă de un administrator.`,
      );
    }

    await this.courseModel.findByIdAndDelete(courseId);
  }

  private async cleanWishlistAndNotify(courseId: string, courseTitle: string): Promise<void> {
    const entries = await this.wishlistModel
      .find({ courseId: new Types.ObjectId(courseId) })
      .select('userId')
      .lean();

    if (entries.length) {
      await this.notificationsService.notifyUsersBatch(
        entries.map((e) => e.userId),
        'wishlist_removed',
        'Curs indisponibil',
        `Cursul „${courseTitle}" pe care l-ai salvat nu mai este disponibil.`,
        courseId,
      );
      await this.wishlistModel.deleteMany({ courseId: new Types.ObjectId(courseId) });
    }
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

/** Builds a regex pattern that matches a query regardless of Romanian diacritics.
 *  e.g. "incep" matches "Începător", "s" matches "ș" etc. */
function buildDiacriticPattern(query: string): string {
  const map: Record<string, string> = {
    a: '[aăâ]', ă: '[aăâ]', â: '[aăâ]',
    i: '[iî]',  î: '[iî]',
    s: '[sșş]', ș: '[sșş]', ş: '[sșş]',
    t: '[tțţ]', ț: '[tțţ]', ţ: '[tțţ]',
  };
  return query
    .split('')
    .map((c) => {
      if (/[.*+?^${}()|[\]\\]/.test(c)) return '\\' + c; // escape regex chars
      return map[c.toLowerCase()] ?? c;
    })
    .join('');
}
