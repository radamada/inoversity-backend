import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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

  async setPasswordResetToken(email: string, token: string, expires: Date): Promise<void> {
    await this.userModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      { passwordResetToken: token, passwordResetExpires: expires },
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user) throw new NotFoundException('Token invalid sau expirat');
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userModel.find().select('-passwordHash').skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(),
    ]);
    return { users, total, page, pages: Math.ceil(total / limit) };
  }

  async setRole(id: string, role: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { role }, { new: true })
      .exec();
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit');
    return user;
  }

  async setActive(id: string, isActive: boolean): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { isActive }, { new: true })
      .exec();
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit');
    return user;
  }
}
