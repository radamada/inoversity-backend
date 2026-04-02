import {
  Controller,
  Get,
  Patch,
  Param,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
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

  @Get(':courseId/certificate')
  async getCertificate(
    @CurrentUser() user: any,
    @Param('courseId') courseId: string,
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

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get('verify/:code')
  verifyCertificate(@Param('code') code: string) {
    return this.enrollmentsService.verifyCertificate(code);
  }
}
