"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcrypt"));
const user_schema_1 = require("./schemas/user.schema");
let UsersService = class UsersService {
    userModel;
    constructor(userModel) {
        this.userModel = userModel;
    }
    async create(dto) {
        const exists = await this.userModel.findOne({ email: dto.email.toLowerCase() });
        if (exists)
            throw new common_1.ConflictException('Email-ul este deja înregistrat');
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
    async findByEmail(email) {
        return this.userModel.findOne({ email: email.toLowerCase() }).select('+passwordHash').exec();
    }
    async findById(id) {
        const user = await this.userModel.findById(id).exec();
        if (!user)
            throw new common_1.NotFoundException('Utilizatorul nu a fost găsit');
        return user;
    }
    async updateProfile(id, dto) {
        const user = await this.userModel
            .findByIdAndUpdate(id, { $set: dto }, { new: true })
            .exec();
        if (!user)
            throw new common_1.NotFoundException('Utilizatorul nu a fost găsit');
        return user;
    }
    async setPasswordResetToken(email, token, expires) {
        await this.userModel.findOneAndUpdate({ email: email.toLowerCase() }, { passwordResetToken: token, passwordResetExpires: expires });
    }
    async resetPassword(token, newPassword) {
        const user = await this.userModel.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: new Date() },
        });
        if (!user)
            throw new common_1.NotFoundException('Token invalid sau expirat');
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
    async setRole(id, role) {
        const user = await this.userModel
            .findByIdAndUpdate(id, { role }, { new: true })
            .exec();
        if (!user)
            throw new common_1.NotFoundException('Utilizatorul nu a fost găsit');
        return user;
    }
    async setActive(id, isActive) {
        const user = await this.userModel
            .findByIdAndUpdate(id, { isActive }, { new: true })
            .exec();
        if (!user)
            throw new common_1.NotFoundException('Utilizatorul nu a fost găsit');
        return user;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map