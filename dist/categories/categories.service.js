"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const slugify_1 = __importDefault(require("slugify"));
const category_schema_1 = require("./schemas/category.schema");
let CategoriesService = class CategoriesService {
    categoryModel;
    constructor(categoryModel) {
        this.categoryModel = categoryModel;
    }
    findAll() {
        return this.categoryModel.find().sort({ name: 1 }).exec();
    }
    async create(name, icon) {
        const slug = (0, slugify_1.default)(name, { lower: true, strict: true });
        const cat = new this.categoryModel({ name, slug, icon });
        return cat.save();
    }
    async delete(id) {
        await this.categoryModel.findByIdAndDelete(id);
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(category_schema_1.Category.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map