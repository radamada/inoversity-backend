"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = app.get(config_1.ConfigService);
    app.use((0, helmet_1.default)());
    app.use((0, cookie_parser_1.default)());
    const frontendUrl = config.get('FRONTEND_URL', 'http://localhost:3000');
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin) || origin === frontendUrl) {
                callback(null, true);
            }
            else {
                callback(new Error(`CORS: origin ${origin} not allowed`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.setGlobalPrefix('api');
    if (config.get('NODE_ENV') !== 'production') {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('EduInovatrium API')
            .setDescription('Platformă cursuri online – API Documentation')
            .setVersion('1.0')
            .addBearerAuth()
            .addCookieAuth('refresh_token')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup('api/docs', app, document);
        console.log(`📚 Swagger docs at http://localhost:${config.get('BACKEND_PORT', 3001)}/api/docs`);
    }
    const port = config.get('BACKEND_PORT', 3001);
    await app.listen(port);
    console.log(`🚀 EduInovatrium API running on http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map