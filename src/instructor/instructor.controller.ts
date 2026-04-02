import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstructorService } from './instructor.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CoursesService } from '../courses/courses.service';
import { CreateCourseDto } from '../courses/dto/create-course.dto';
import { CouponsService } from '../coupons/coupons.service';
import type { CreateCouponDto } from '../coupons/coupons.service';

class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

class CreateSectionDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  title: string;
}

class UpdateSectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  order?: number;
}

class CreateLessonDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cdnVideoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  isFree?: boolean;
}

@ApiTags('Instructor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('instructor')
@Controller('instructor')
export class InstructorController {
  constructor(
    private readonly instructorService: InstructorService,
    private readonly coursesService: CoursesService,
    private readonly couponsService: CouponsService,
  ) {}

  // ── Stats ──────────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Statisticile mele ca instructor' })
  getStats(@CurrentUser() user: any) {
    return this.instructorService.getMyStats(user._id.toString());
  }

  @Get('stats/monthly-revenue')
  @ApiOperation({ summary: 'Venituri lunare (ultimele 12 luni)' })
  getMonthlyRevenue(@CurrentUser() user: any) {
    return this.instructorService.getMonthlyRevenue(user._id.toString());
  }

  // ── Courses ────────────────────────────────────────────────────────────────

  @Get('courses')
  @ApiOperation({ summary: 'Cursurile mele' })
  getMyCourses(@CurrentUser() user: any) {
    return this.instructorService.getMyCourses(user._id.toString());
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'Un curs al meu după ID' })
  getCourse(@Param('id') id: string, @CurrentUser() user: any) {
    return this.instructorService.getCourseById(id, user._id.toString(), false);
  }

  @Post('courses')
  @ApiOperation({ summary: 'Creare curs nou' })
  createCourse(@Body() dto: CreateCourseDto, @CurrentUser() user: any) {
    return this.coursesService.create(dto, user._id.toString());
  }

  @Patch('courses/:id')
  @ApiOperation({ summary: 'Actualizare curs' })
  updateCourse(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCourseDto>,
    @CurrentUser() user: any,
  ) {
    return this.coursesService.update(id, dto, user._id.toString(), false);
  }

  @Patch('courses/:id/publish')
  @ApiOperation({ summary: 'Toggle publicare curs' })
  togglePublish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.instructorService.togglePublish(id, user._id.toString(), false);
  }

  @Patch('courses/:id/publish-changes')
  @ApiOperation({ summary: 'Publică modificările în așteptare' })
  publishChanges(@Param('id') id: string, @CurrentUser() user: any) {
    return this.coursesService.publishPendingChanges(id, user._id.toString(), false);
  }

  @Delete('courses/:id/pending-changes')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Renunță la modificările în așteptare' })
  discardChanges(@Param('id') id: string, @CurrentUser() user: any) {
    return this.coursesService.discardPendingChanges(id, user._id.toString(), false);
  }

  @Put('courses/:id/pending-curriculum')
  @ApiOperation({ summary: 'Salvează curriculumul ca modificări în așteptare' })
  savePendingCurriculum(
    @Param('id') id: string,
    @Body() body: { curriculum: any[] },
    @CurrentUser() user: any,
  ) {
    return this.coursesService.savePendingCurriculum(id, body.curriculum, user._id.toString(), false);
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({ summary: 'Comenzile pentru cursurile mele' })
  getMyOrders(@Query() q: PaginationDto, @CurrentUser() user: any) {
    return this.instructorService.getMyOrders(user._id.toString(), q.page, q.limit);
  }

  // ── Sections ──────────────────────────────────────────────────────────────

  @Post('courses/:courseId/sections')
  createSection(
    @Param('courseId') courseId: string,
    @Body() dto: CreateSectionDto,
    @CurrentUser() user: any,
  ) {
    return this.instructorService.createSection(courseId, dto.title, user._id.toString(), false);
  }

  @Patch('sections/:id')
  updateSection(
    @Param('id') id: string,
    @Body() dto: UpdateSectionDto,
    @CurrentUser() user: any,
  ) {
    return this.instructorService.updateSection(id, dto, user._id.toString(), false);
  }

  @Delete('sections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSection(@Param('id') id: string, @CurrentUser() user: any) {
    return this.instructorService.deleteSection(id, user._id.toString(), false);
  }

  // ── Lessons ───────────────────────────────────────────────────────────────

  @Post('sections/:sectionId/lessons')
  createLesson(
    @Param('sectionId') sectionId: string,
    @Query('courseId') courseId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser() user: any,
  ) {
    return this.instructorService.createLesson(sectionId, courseId, dto, user._id.toString(), false);
  }

  @Patch('lessons/:id')
  updateLesson(
    @Param('id') id: string,
    @Body() dto: Partial<CreateLessonDto>,
    @CurrentUser() user: any,
  ) {
    return this.instructorService.updateLesson(id, dto, user._id.toString(), false);
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLesson(@Param('id') id: string, @CurrentUser() user: any) {
    return this.instructorService.deleteLesson(id, user._id.toString(), false);
  }

  // ── Coupons ───────────────────────────────────────────────────────────────

  @Get('coupons')
  @ApiOperation({ summary: 'Cupoanele mele' })
  getMyCoupons(@CurrentUser() user: any) {
    // Admin sees all; instructor sees only own
    if (false) {
      return this.couponsService.findAll();
    }
    return this.couponsService.findByInstructor(user._id.toString());
  }

  @Post('coupons')
  @ApiOperation({ summary: 'Creează cupon (custom sau random)' })
  @HttpCode(HttpStatus.CREATED)
  createCoupon(@Body() dto: CreateCouponDto, @CurrentUser() user: any) {
    return this.couponsService.createForInstructor(dto, user._id.toString());
  }

  @Patch('coupons/:id')
  @ApiOperation({ summary: 'Actualizează cupon propriu' })
  updateCoupon(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCouponDto>,
    @CurrentUser() user: any,
  ) {
    return this.couponsService.updateForInstructor(id, dto, user._id.toString(), false);
  }

  @Delete('coupons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Șterge cupon propriu' })
  removeCoupon(@Param('id') id: string, @CurrentUser() user: any) {
    return this.couponsService.removeForInstructor(id, user._id.toString(), false);
  }
}
