import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private userModel;
    constructor(userModel: Model<UserDocument>);
    create(dto: CreateUserDto): Promise<UserDocument>;
    findByEmail(email: string): Promise<UserDocument | null>;
    findById(id: string): Promise<UserDocument>;
    updateProfile(id: string, dto: UpdateUserDto): Promise<UserDocument>;
    setPasswordResetToken(email: string, token: string, expires: Date): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
    findAll(page?: number, limit?: number): Promise<{
        users: (import("mongoose").Document<unknown, {}, UserDocument, {}, import("mongoose").DefaultSchemaOptions> & User & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
        total: number;
        page: number;
        pages: number;
    }>;
    setRole(id: string, role: string): Promise<UserDocument>;
    setActive(id: string, isActive: boolean): Promise<UserDocument>;
}
