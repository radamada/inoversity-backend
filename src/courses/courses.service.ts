import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
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
import { MediaService } from '../media/media.service';
import { AppCacheService } from '../common/cache/app-cache.service';

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
    private mediaService: MediaService,
    private appCache: AppCacheService,
  ) {}

  // ── Cache invalidation ───────────────────────────────────────────────────

  /** Invalidate all course-related caches. Called on any course mutation. */
  private async invalidateCourseCache(slug?: string): Promise<void> {
    await Promise.all([
      this.appCache.invalidateByPrefix('courses:list:'),
      this.appCache.invalidateByPrefix('courses:also-bought:'),
      slug
        ? this.appCache.del(`courses:slug:${slug}`)
        : this.appCache.invalidateByPrefix('courses:slug:'),
    ]);
  }

  /** Invalidate curriculum cache for a specific course. */
  private async invalidateCurriculumCache(courseId: string): Promise<void> {
    await this.appCache.del(`courses:curriculum:${courseId}`);
  }

  // ── Courses ──────────────────────────────────────────────────────────────

  async findAll(query: CourseQueryDto, onlyPublished = true) {
    // Cache only public (non-admin) course listings
    const cacheKey = onlyPublished
      ? `courses:list:${JSON.stringify(query)}`
      : null;
    if (cacheKey) {
      const cached = await this.appCache.get(cacheKey);
      if (cached) return cached;
    }

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

    const result = { courses, total, page, pages: Math.ceil(total / limit) };
    if (cacheKey) await this.appCache.set(cacheKey, result, 300_000); // 5 min
    return result;
  }

  async findBySlug(slug: string): Promise<CourseDocument> {
    const cacheKey = `courses:slug:${slug}`;
    const cached = await this.appCache.get<CourseDocument>(cacheKey);
    if (cached) return cached;

    const course = await this.courseModel
      .findOne({ slug, published: true })
      .populate('instructorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .exec();
    if (!course) throw new NotFoundException('Cursul nu a fost găsit');

    await this.appCache.set(cacheKey, course, 300_000); // 5 min
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
    const existing = await this.courseModel.findOne({
      title: { $regex: new RegExp(`^${dto.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (existing) {
      throw new ConflictException('Există deja un curs cu acest titlu');
    }

    const slug = await this.generateUniqueSlug(dto.title);
    const course = new this.courseModel({
      ...dto,
      slug,
      instructorId: new Types.ObjectId(instructorId),
      categoryId: dto.categoryId ? new Types.ObjectId(dto.categoryId) : null,
    });
    try {
      const saved = await course.save();
      await this.invalidateCourseCache();
      return saved;
    } catch (err: any) {
      if (err?.code === 11000 && err?.keyPattern?.slug) {
        course.slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
        const saved = await course.save();
        await this.invalidateCourseCache();
        return saved;
      }
      throw err;
    }
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
      await this.invalidateCourseCache(updated.slug);
      return updated;
    }

    // Draft course → apply directly
    const updated = await this.courseModel
      .findByIdAndUpdate(id, { $set: changes }, { new: true })
      .populate('instructorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .exec();
    if (!updated) throw new NotFoundException('Cursul nu a fost găsit');
    await this.invalidateCourseCache(updated.slug);
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
        type?: 'video' | 'quiz';
        cdnVideoId?: string;
        duration?: number;
        isFree?: boolean;
        questions?: Array<{ question: string; options: string[]; correctIndex: number }>;
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

    // Delete CDN videos that were in the previous pending curriculum but are removed in the new one
    const prevPendingCurriculum = (existing.pendingChanges as any)?.curriculum;
    if (Array.isArray(prevPendingCurriculum)) {
      const prevVideoIds = new Set<string>(
        prevPendingCurriculum
          .flatMap((s: any) => s.lessons as any[])
          .filter((l: any) => l.type !== 'quiz' && l.cdnVideoId)
          .map((l: any) => l.cdnVideoId as string),
      );
      const newVideoIds = new Set<string>(
        curriculum
          .flatMap((s) => s.lessons)
          .filter((l) => l.type !== 'quiz' && l.cdnVideoId)
          .map((l) => l.cdnVideoId!),
      );
      for (const vid of prevVideoIds) {
        if (!newVideoIds.has(vid)) {
          this.mediaService.deleteVideo(vid).catch(() => null);
        }
      }
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

    // Apply curriculum changes only if non-empty and every section has a valid lessons array
    const curriculumValid =
      curriculum &&
      Array.isArray(curriculum) &&
      curriculum.length > 0 &&
      curriculum.every((s: any) => Array.isArray(s.lessons));
    if (curriculumValid) {
      // Block publish if any video is still processing on CDN
      const videoIds: string[] = curriculum
        .flatMap((s: any) => s.lessons as any[])
        .filter((l: any) => l.type !== 'quiz' && l.cdnVideoId)
        .map((l: any) => l.cdnVideoId as string);

      if (videoIds.length > 0) {
        const statuses = await Promise.all(
          videoIds.map((vid) => this.mediaService.getVideoStatus(vid).catch(() => ({ status: 5, encodeProgress: 0 }))),
        );
        const notReady = statuses.some((s) => s.status !== 4);
        if (notReady) {
          throw new BadRequestException('Există videoclipuri care nu au terminat procesarea. Așteptați și încercați din nou.');
        }
      }

      await this.applyCurriculumChanges(id, curriculum);
    }

    // Apply course metadata fields first (keep pendingChanges until everything succeeds)
    if (Object.keys(courseFields).length > 0) {
      await this.courseModel.updateOne({ _id: id }, { $set: courseFields });
    }

    // Only clear pendingChanges after all mutations succeeded
    const updated = await this.courseModel
      .findByIdAndUpdate(
        id,
        { $unset: { pendingChanges: '' } },
        { new: true },
      )
      .populate('instructorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .exec();
    if (!updated) throw new NotFoundException('Cursul nu a fost găsit');

    await Promise.all([
      this.invalidateCourseCache(updated.slug),
      this.invalidateCurriculumCache(id),
    ]);

    // Notify enrolled users only after the new version is live
    await this.notificationsService.notifyEnrolledUsers(
      id,
      'course_updated',
      `Cursul "${updated.title}" a fost actualizat`,
      `Instructorul a adus modificări cursului "${updated.title}". Intră să vezi ce s-a schimbat!`,
    ).catch(() => {}); // Don't fail the publish if notification fails

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
        type?: 'video' | 'quiz';
        cdnVideoId?: string;
        duration?: number;
        isFree?: boolean;
        questions?: Array<{ question: string; options: string[]; correctIndex: number }>;
      }>;
    }>,
  ): Promise<void> {
    const cid = new Types.ObjectId(courseId);
    const keptSectionIds: Types.ObjectId[] = [];
    const keptLessonIds: Types.ObjectId[] = [];

    for (let i = 0; i < pendingSections.length; i++) {
      const ps = pendingSections[i];
      let sectionDbId: string;

      if (ps.sectionId) {
        const updated = await this.sectionModel.findByIdAndUpdate(ps.sectionId, { title: ps.title, order: i });
        if (updated) {
          sectionDbId = ps.sectionId;
        } else {
          const newSection = new this.sectionModel({ courseId: cid, title: ps.title, order: i });
          await newSection.save();
          sectionDbId = (newSection._id as Types.ObjectId).toString();
        }
      } else {
        const newSection = new this.sectionModel({ courseId: cid, title: ps.title, order: i });
        await newSection.save();
        sectionDbId = (newSection._id as Types.ObjectId).toString();
      }

      keptSectionIds.push(new Types.ObjectId(sectionDbId));

      for (let j = 0; j < ps.lessons.length; j++) {
        const pl = ps.lessons[j];
        const isQuiz = pl.type === 'quiz';
        const lessonData = {
          title: pl.title,
          type: pl.type ?? 'video',
          cdnVideoId: isQuiz ? '' : (pl.cdnVideoId ?? ''),
          duration: isQuiz ? 0 : (pl.duration ?? 0),
          isFree: isQuiz ? false : (pl.isFree ?? false),
          questions: isQuiz ? (pl.questions ?? []) : [],
          order: j,
        };

        let lessonDbId: Types.ObjectId;
        if (pl.lessonId) {
          const updated = await this.lessonModel.findByIdAndUpdate(pl.lessonId, lessonData);
          if (updated) {
            lessonDbId = new Types.ObjectId(pl.lessonId);
          } else {
            const newLesson = new this.lessonModel({ courseId: cid, sectionId: new Types.ObjectId(sectionDbId), ...lessonData });
            await newLesson.save();
            lessonDbId = newLesson._id as Types.ObjectId;
          }
        } else {
          const newLesson = new this.lessonModel({ courseId: cid, sectionId: new Types.ObjectId(sectionDbId), ...lessonData });
          await newLesson.save();
          lessonDbId = newLesson._id as Types.ObjectId;
        }
        keptLessonIds.push(lessonDbId);
      }
    }

    // Delete lessons and sections removed from the curriculum
    const removedLessons = await this.lessonModel
      .find({ courseId: cid, _id: { $nin: keptLessonIds } })
      .select('cdnVideoId')
      .lean();
    await this.lessonModel.deleteMany({ courseId: cid, _id: { $nin: keptLessonIds } });
    await this.sectionModel.deleteMany({ courseId: cid, _id: { $nin: keptSectionIds } });
    // Fire-and-forget CDN cleanup — don't fail the publish if CDN deletion errors
    for (const lesson of removedLessons) {
      if (lesson.cdnVideoId) {
        this.mediaService.deleteVideo(lesson.cdnVideoId).catch(() => null);
      }
    }
  }

  async discardPendingChanges(id: string, userId: string, isAdmin = false, pageVideoIds: string[] = []): Promise<CourseDocument> {
    const course = await this.courseModel.findById(id).select('instructorId pendingChanges').lean();
    if (!course) throw new NotFoundException('Cursul nu a fost găsit');
    if (!isAdmin && course.instructorId.toString() !== userId) {
      throw new ForbiddenException('Nu ai permisiunea de a modifica acest curs');
    }

    // Collect video IDs from pending curriculum (backend state)
    const pendingCurriculum = (course.pendingChanges as any)?.curriculum;
    const pendingVideoIds: string[] = Array.isArray(pendingCurriculum)
      ? pendingCurriculum
          .flatMap((s: any) => s.lessons as any[])
          .filter((l: any) => l.type !== 'quiz' && l.cdnVideoId)
          .map((l: any) => l.cdnVideoId as string)
      : [];

    // Merge with video IDs reported by the frontend (current page state) — deduped
    const allCandidateIds = [...new Set([...pendingVideoIds, ...pageVideoIds.filter(Boolean)])];

    if (allCandidateIds.length > 0) {
      const publishedVideoIds = await this.lessonModel
        .find({ courseId: new Types.ObjectId(id) })
        .distinct('cdnVideoId');
      const publishedSet = new Set(publishedVideoIds.map((v: any) => v.toString()));
      for (const vid of allCandidateIds) {
        if (!publishedSet.has(vid)) {
          this.mediaService.deleteVideo(vid).catch(() => null);
        }
      }
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
    const course = await this.courseModel
      .findById(id)
      .populate('instructorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .exec();
    if (!course) throw new NotFoundException('Cursul nu a fost găsit');
    const wasPublished = course.published;
    course.published = !course.published;
    const saved = await course.save();
    await this.invalidateCourseCache(saved.slug);

    if (wasPublished && !saved.published) {
      // Scos din publicare: curăță wishlist-uri + notifică studenți înscriși
      await this.cleanWishlistAndNotify(saved._id.toString(), saved.title);
      this.notificationsService.notifyEnrolledUsers(
        saved._id.toString(),
        'course_retracted',
        'Curs retras',
        `Cursul „${saved.title}" a fost retras de formator și nu mai primește actualizări.`,
      ).catch(() => null);
    } else if (!wasPublished && saved.published) {
      // Re-publicat: notifică studenți înscriși
      this.notificationsService.notifyEnrolledUsers(
        saved._id.toString(),
        'course_republished',
        'Vești bune!',
        `Cursul „${saved.title}" este din nou disponibil și urmează să primească actualizări.`,
      ).catch(() => null);
    }

    return saved;
  }

  async checkEnrollment(courseId: string, userId: string): Promise<boolean> {
    const enrollment = await this.enrollmentModel
      .findOne({ userId: new Types.ObjectId(userId), courseId: new Types.ObjectId(courseId), status: { $ne: 'refunded' } })
      .lean();
    return !!enrollment;
  }

  async findBySlugForEnrolled(slug: string, userId: string): Promise<CourseDocument> {
    const course = await this.courseModel
      .findOne({ slug })
      .populate('instructorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .exec();
    if (!course) throw new NotFoundException('Cursul nu a fost găsit');
    if (course.published) return course; // public access for published courses
    // Unpublished — allow only if user is enrolled
    const enrollment = await this.enrollmentModel
      .findOne({ userId: new Types.ObjectId(userId), courseId: course._id, status: { $ne: 'refunded' } })
      .lean();
    if (!enrollment) throw new NotFoundException('Cursul nu a fost găsit');
    return course;
  }

  async getAlsoBought(courseId: string, limit = 4): Promise<CourseDocument[]> {
    const cacheKey = `courses:also-bought:${courseId}`;
    const cached = await this.appCache.get<CourseDocument[]>(cacheKey);
    if (cached) return cached;

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

    const courses = await this.courseModel
      .find({ _id: { $in: ids }, published: true })
      .select('title slug thumbnail price rating reviewCount instructorId')
      .populate('instructorId', 'name')
      .lean();

    await this.appCache.set(cacheKey, courses, 900_000); // 15 min
    return courses as any;
  }

  async delete(id: string): Promise<void> {
    const course = await this.courseModel
      .findById(id)
      .select('_id title instructorId thumbnail')
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

    // Colectează CDN video IDs înainte de ștergere
    const lessons = await this.lessonModel
      .find({ courseId })
      .select('cdnVideoId')
      .lean();
    const cdnVideoIds = lessons.map((l) => l.cdnVideoId).filter(Boolean) as string[];

    // Faza 2: ștergere bulk din toate colecțiile
    await Promise.all([
      this.enrollmentModel.deleteMany({ courseId }),
      this.reviewModel.deleteMany({ courseId }),
      this.cartModel.updateMany({ items: courseId }, { $pull: { items: courseId } }),
      this.sectionModel.deleteMany({ courseId }),
      this.lessonModel.deleteMany({ courseId }),
    ]);

    // Curăță CDN videos și thumbnail (fire-and-forget)
    for (const videoId of cdnVideoIds) {
      this.mediaService.deleteVideo(videoId).catch(() => null);
    }
    if (course.thumbnail) {
      this.mediaService.deleteImage(course.thumbnail).catch(() => null);
    }

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
    await Promise.all([
      this.invalidateCourseCache(),
      this.invalidateCurriculumCache(courseId.toString()),
    ]);
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
    const lesson = await this.lessonModel.findByIdAndDelete(lessonId).lean();
    if (lesson?.cdnVideoId) {
      this.mediaService.deleteVideo(lesson.cdnVideoId).catch(() => null);
    }
  }

  async getCurriculum(courseId: string, includeCorrectAnswers = false) {
    // Cache only public curriculum (without correct answers)
    const cacheKey = !includeCorrectAnswers ? `courses:curriculum:${courseId}` : null;
    if (cacheKey) {
      const cached = await this.appCache.get(cacheKey);
      if (cached) return cached;
    }

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

    // Strip correctIndex from quiz questions for students
    const sanitizedLessons = includeCorrectAnswers
      ? lessons
      : lessons.map((l) => {
          if (l.type !== 'quiz' || !l.questions?.length) return l;
          return {
            ...l,
            questions: (l.questions as any[]).map(({ correctIndex: _ci, ...q }) => q),
          };
        });

    const curriculum = sections.map((section) => ({
      ...section,
      lessons: sanitizedLessons.filter(
        (l) => l.sectionId.toString() === (section as any)._id.toString(),
      ),
    }));

    if (cacheKey) await this.appCache.set(cacheKey, curriculum, 300_000); // 5 min
    return curriculum;
  }

  async getLessonCounts(courseIds: string[]): Promise<Record<string, number>> {
    if (!courseIds.length) return {};
    const objectIds = courseIds.map((id) => new Types.ObjectId(id));
    const results = await this.lessonModel.aggregate([
      { $match: { courseId: { $in: objectIds } } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
    ]);
    const map: Record<string, number> = {};
    for (const r of results) {
      map[r._id.toString()] = r.count;
    }
    return map;
  }

  async createQuiz(
    courseId: string,
    sectionId: string,
    data: { title: string; questions: { question: string; options: string[]; correctIndex: number }[] },
  ): Promise<LessonDocument> {
    const count = await this.lessonModel.countDocuments({ sectionId: new Types.ObjectId(sectionId) });
    const quiz = new this.lessonModel({
      courseId: new Types.ObjectId(courseId),
      sectionId: new Types.ObjectId(sectionId),
      title: data.title,
      type: 'quiz',
      questions: data.questions,
      order: count,
    });
    return quiz.save();
  }

  async updateQuiz(
    quizId: string,
    data: Partial<{ title: string; order: number; questions: { question: string; options: string[]; correctIndex: number }[] }>,
  ): Promise<LessonDocument> {
    const quiz = await this.lessonModel.findByIdAndUpdate(
      quizId,
      { $set: data },
      { new: true },
    );
    if (!quiz) throw new NotFoundException('Quiz-ul nu a fost găsit');
    return quiz;
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
      await this.invalidateCourseCache();
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
