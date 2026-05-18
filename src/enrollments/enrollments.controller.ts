import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsArray, IsNumber } from 'class-validator';
import { EnrollmentsService } from './enrollments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';

class SubmitQuizDto {
  @IsArray()
  answers: number[][];
}

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

  @Get('check/:courseId')
  async checkEnrolled(@CurrentUser() user: any, @Param('courseId', ParseObjectIdPipe) courseId: string) {
    const enrolled = await this.enrollmentsService.isEnrolled(user._id.toString(), courseId);
    return { enrolled };
  }

  @Get(':courseId/progress')
  getProgress(@CurrentUser() user: any, @Param('courseId', ParseObjectIdPipe) courseId: string) {
    return this.enrollmentsService.getProgress(user._id.toString(), courseId);
  }

  @Get(':courseId/certificate')
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  async getCertificate(
    @CurrentUser() user: any,
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.enrollmentsService.generateCertificate(user._id.toString(), courseId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificat-${courseId}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Patch(':courseId/lessons/:lessonId/progress')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 120 } })
  markLesson(
    @CurrentUser() user: any,
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @Param('lessonId', ParseObjectIdPipe) lessonId: string,
  ) {
    return this.enrollmentsService.markLessonComplete(
      user._id.toString(),
      courseId,
      lessonId,
    );
  }

  @Post(':courseId/quiz/:quizId/submit')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  submitQuiz(
    @CurrentUser() user: any,
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @Param('quizId', ParseObjectIdPipe) quizId: string,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.enrollmentsService.submitQuizAttempt(
      user._id.toString(),
      courseId,
      quizId,
      dto.answers,
    );
  }
}

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get('verify/:code')
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  verifyCertificate(@Param('code') code: string) {
    return this.enrollmentsService.verifyCertificate(code);
  }
}
