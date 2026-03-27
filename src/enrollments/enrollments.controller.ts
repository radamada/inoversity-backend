import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  getMyEnrollments(@CurrentUser() user: any) {
    return this.enrollmentsService.getMyEnrollments(user._id.toString());
  }

  @Get(':courseId/progress')
  getProgress(@CurrentUser() user: any, @Param('courseId') courseId: string) {
    return this.enrollmentsService.getProgress(user._id.toString(), courseId);
  }

  @Patch(':courseId/lessons/:lessonId/progress')
  @HttpCode(HttpStatus.OK)
  markLesson(
    @CurrentUser() user: any,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.enrollmentsService.markLessonComplete(
      user._id.toString(),
      courseId,
      lessonId,
    );
  }
}
