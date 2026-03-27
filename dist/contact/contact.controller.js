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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const contact_dto_1 = require("./contact.dto");
const mail_service_1 = require("../mail/mail.service");
let ContactController = class ContactController {
    mailService;
    constructor(mailService) {
        this.mailService = mailService;
    }
    async sendMessage(dto) {
        await this.mailService.sendContactEmail(dto);
        return { success: true };
    }
};
exports.ContactController = ContactController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Trimite un mesaj de contact' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [contact_dto_1.ContactDto]),
    __metadata("design:returntype", Promise)
], ContactController.prototype, "sendMessage", null);
exports.ContactController = ContactController = __decorate([
    (0, swagger_1.ApiTags)('contact'),
    (0, common_1.Controller)('contact'),
    __metadata("design:paramtypes", [mail_service_1.MailService])
], ContactController);
//# sourceMappingURL=contact.controller.js.map