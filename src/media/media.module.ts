import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaService } from './media.service';
import { MediaController, PublicMediaController } from './media.controller';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { Lesson, LessonSchema } from '../courses/schemas/lesson.schema';

@Module({
  imports: [
    EnrollmentsModule,
    MongooseModule.forFeature([{ name: Lesson.name, schema: LessonSchema }]),
  ],
  providers: [MediaService],
  controllers: [MediaController, PublicMediaController],
  exports: [MediaService],
})
export class MediaModule {}
