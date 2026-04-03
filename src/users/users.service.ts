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
import { User, UserDocument } from './schemas/user.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
  ) {}

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
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+passwordHash').exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit');
    return user;
  }

  async updateProfile(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit');
    return user;
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userModel.findById(id).select('+passwordHash').exec();
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit');
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Parola curentă este incorectă');
    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await user.save();
    return { message: 'Parola a fost schimbată cu succes' };
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
    // Hash and save new password separately (token already consumed above)
    await this.userModel.updateOne(
      { _id: user._id },
      { $set: { passwordHash: await bcrypt.hash(newPassword, 12) } },
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
    const user = await this.userModel
      .findByIdAndUpdate(id, { role }, { new: true })
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
}
