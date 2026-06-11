import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserDocument } from './schemas/user.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AppCacheService } from '../common/cache/app-cache.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    private readonly appCache: AppCacheService,
  ) {}

  /**
   * Invalidate course caches that embed this instructor's name/avatar so
   * profile changes (e.g. avatar upload) propagate immediately to course
   * listings and detail pages.
   */
  private async invalidateCoursesForInstructor(instructorId: string): Promise<void> {
    const slugs = await this.courseModel
      .find({ instructorId: new Types.ObjectId(instructorId) })
      .select('slug')
      .lean();
    await Promise.all([
      this.appCache.invalidateByPrefix('courses:list:'),
      this.appCache.invalidateByPrefix('courses:also-bought:'),
      ...slugs.map((c) => this.appCache.del(`courses:slug:${c.slug}`)),
    ]);
  }

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const exists = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (exists) throw new ConflictException('Email-ul este deja înregistrat');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = new this.userModel({
      email: dto.email.toLowerCase(),
      passwordHash,
      name: dto.name,
      termsAccepted: dto.termsAccepted ?? false,
      termsAcceptedAt: dto.termsAcceptedAt ?? null,
    });
    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+passwordHash +googleId').exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit');
    return user;
  }

  /**
   * Variant for the auth strategies (jwt + jwt-refresh) which need to compare
   * the incoming JWT's tokenVersion against the user's current tokenVersion.
   * Returns the userul with tokenVersion explicitly selected.
   */
  async findByIdForAuth(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).select('+tokenVersion').exec();
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit');
    return user;
  }

  async updateProfile(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit');
    // If instructor-visible fields changed (name/avatar/bio), drop cached course
    // listings and detail pages so the new value shows up immediately.
    if (dto.name !== undefined || dto.avatar !== undefined || dto.bio !== undefined) {
      await this.invalidateCoursesForInstructor(id).catch(() => null);
    }
    return user;
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userModel.findById(id).select('+passwordHash').exec();
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit');
    if (!user.passwordHash) {
      throw new BadRequestException(
        'Contul tău este conectat prin Google și nu are o parolă setată.',
      );
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Parola curentă este incorectă');
    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await user.save();
    return { message: 'Parola a fost schimbată cu succes' };
  }

  /**
   * Finds an existing user by Google ID, or by email (account linking),
   * or creates a new user for first-time Google sign-in.
   */
  async findOrCreateGoogleUser(dto: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }): Promise<UserDocument> {
    // 1. Existing Google account
    const byGoogleId = await this.userModel.findOne({ googleId: dto.googleId }).exec();
    if (byGoogleId) return byGoogleId;

    // 2. Existing email+password account → link Google to it
    const byEmail = await this.userModel
      .findOne({ email: dto.email.toLowerCase() })
      .exec();
    if (byEmail) {
      byEmail.googleId = dto.googleId;
      if (!byEmail.avatar && dto.avatar) byEmail.avatar = dto.avatar;
      return byEmail.save();
    }

    // 3. Brand-new user via Google
    return this.userModel.create({
      email: dto.email.toLowerCase(),
      name: dto.name,
      googleId: dto.googleId,
      passwordHash: null,
      avatar: dto.avatar ?? '',
      emailVerified: true,   // Google guarantees email ownership
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    });
  }

  async setPasswordResetToken(email: string, token: string, expires: Date): Promise<void> {
    await this.userModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      { passwordResetToken: token, passwordResetExpires: expires },
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Atomically consume the token — prevents race-condition double-use
    const user = await this.userModel.findOneAndUpdate(
      { passwordResetToken: token, passwordResetExpires: { $gt: new Date() } },
      { $unset: { passwordResetToken: '', passwordResetExpires: '' } },
      { new: false }, // return original doc to verify token was found
    );
    if (!user) throw new NotFoundException('Token invalid sau expirat');
    // Hash and save new password separately (token already consumed above).
    // $inc tokenVersion: reset-ul de parolă e acțiunea „am fost compromis",
    // deci invalidează toate sesiunile existente (access + refresh), la fel ca
    // logout/email-change. Fără asta, un token furat supraviețuia reset-ului.
    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash: await bcrypt.hash(newPassword, 12) },
        $inc: { tokenVersion: 1 },
      },
    );
  }

  async findAll(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const query: any = {};
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.email = { $regex: escaped, $options: 'i' };
    }
    const [users, total] = await Promise.all([
      this.userModel.find(query).select('-passwordHash').skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(query),
    ]);
    return { users, total, page, pages: Math.ceil(total / limit) };
  }

  async incrementTokenVersion(id: string): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });
  }

  async setRole(id: string, role: string): Promise<UserDocument> {
    const update: any = { $set: { role } };
    if (role === 'instructor') {
      // Set default revenue share of 50% only if not already configured
      const existing = await this.userModel.findById(id).select('revenueSharePercent').lean().exec();
      if (existing && (existing.revenueSharePercent === 0 || existing.revenueSharePercent == null)) {
        update.$set.revenueSharePercent = 50;
      }
    } else {
      // Clear revenue share when role is no longer instructor
      update.$unset = { revenueSharePercent: '' };
    }
    const user = await this.userModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit');
    return user;
  }

  async listPublicInstructors(): Promise<{ _id: string; name: string; avatar: string }[]> {
    // Only instructors (not admins) who have at least one published course
    const instructorIds = await this.courseModel.distinct('instructorId', { published: true });
    return this.userModel
      .find({ _id: { $in: instructorIds }, role: 'instructor', isActive: true })
      .select('name avatar')
      .sort({ name: 1 })
      .lean()
      .exec() as any;
  }

  async getPublicInstructorProfile(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID instructor invalid');
    }

    // Only expose safe public fields — never email, role, tokens, etc.
    const instructor = await this.userModel
      .findOne({
        _id: new Types.ObjectId(id),
        role: { $in: ['instructor', 'admin'] },
        isActive: true,
      })
      .select('name avatar bio createdAt')
      .lean()
      .exec();

    if (!instructor) throw new NotFoundException('Instructorul nu a fost găsit');

    // Only published courses — only safe public fields
    const courses = await this.courseModel
      .find({ instructorId: new Types.ObjectId(id), published: true })
      .select('title slug thumbnail price rating reviewCount enrollmentCount level')
      .sort({ enrollmentCount: -1 })
      .lean()
      .exec();

    return { instructor, courses };
  }

  async setActive(id: string, isActive: boolean): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { isActive }, { new: true })
      .exec();
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit');
    return user;
  }

  async requestEmailChange(userId: string, newEmail: string, currentPassword?: string): Promise<string> {
    const user = await this.userModel.findById(userId).select('+passwordHash').exec();
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit');

    // Require password verification for email+password accounts
    if (user.passwordHash) {
      if (!currentPassword) {
        throw new BadRequestException('Parola curentă este obligatorie pentru schimbarea email-ului');
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) throw new UnauthorizedException('Parola curentă este incorectă');
    }

    if (newEmail === user.email) {
      throw new BadRequestException('Noua adresă de email este identică cu cea curentă');
    }

    const exists = await this.userModel.findOne({ email: newEmail }).exec();
    if (exists) throw new ConflictException('Adresa de email este deja utilizată');

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await this.userModel.findByIdAndUpdate(userId, {
      pendingEmail: newEmail,
      emailChangeToken: token,
      emailChangeTokenExpires: expires,
      emailChangeOldConfirmed: false,
    });

    return token;
  }

  async confirmOldEmailChange(token: string): Promise<{ pendingEmail: string; token: string }> {
    const user = await this.userModel.findOne({
      emailChangeToken: token,
      emailChangeTokenExpires: { $gt: new Date() },
      emailChangeOldConfirmed: false,
    }).exec();

    if (!user) {
      // Token expirat — curățăm câmpurile stale ca side-effect
      await this.userModel.updateOne(
        { emailChangeToken: token },
        { $unset: { pendingEmail: '', emailChangeToken: '', emailChangeTokenExpires: '' }, $set: { emailChangeOldConfirmed: false } },
      );
      throw new NotFoundException('Token invalid sau expirat. Te rugăm să reiei procesul din pagina de profil.');
    }

    user.emailChangeOldConfirmed = true;
    await user.save();

    return { pendingEmail: user.pendingEmail!, token };
  }

  async confirmNewEmailChange(token: string): Promise<{ message: string; oldEmail: string }> {
    const user = await this.userModel.findOne({
      emailChangeToken: token,
      emailChangeTokenExpires: { $gt: new Date() },
      emailChangeOldConfirmed: true,
    }).exec();

    if (!user) {
      // Token expirat sau emailChangeOldConfirmed rămas true după expirare — curățăm stale data
      await this.userModel.updateOne(
        { emailChangeToken: token },
        { $unset: { pendingEmail: '', emailChangeToken: '', emailChangeTokenExpires: '' }, $set: { emailChangeOldConfirmed: false } },
      );
      throw new NotFoundException('Token invalid sau expirat. Te rugăm să reiei procesul din pagina de profil.');
    }

    // Verificăm din nou unicitatea — alt user ar fi putut prelua email-ul între timp
    const conflict = await this.userModel.findOne({
      email: user.pendingEmail,
      _id: { $ne: user._id },
    }).exec();
    if (conflict) {
      // Anulăm cererea — email-ul nu mai e disponibil
      user.pendingEmail = null;
      user.emailChangeToken = null;
      user.emailChangeTokenExpires = null;
      user.emailChangeOldConfirmed = false;
      await user.save();
      throw new ConflictException('Adresa de email a fost deja revendicată de alt cont. Te rugăm să alegi o altă adresă.');
    }

    const oldEmail = user.email;

    user.email = user.pendingEmail!;
    user.pendingEmail = null;
    user.emailChangeToken = null;
    user.emailChangeTokenExpires = null;
    user.emailChangeOldConfirmed = false;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1; // invalidăm toate sesiunile existente
    await user.save();

    return { message: 'Adresa de email a fost schimbată cu succes', oldEmail };
  }
}
