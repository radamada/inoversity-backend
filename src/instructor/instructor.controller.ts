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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max, MinLength, IsArray, ArrayMaxSize, ArrayMinSize, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstructorService } from './instructor.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CoursesService } from '../courses/courses.service';
import { CreateCourseDto } from '../courses/dto/create-course.dto';
import { SaveCurriculumDto } from '../courses/dto/save-curriculum.dto';
import { CouponsService } from '../coupons/coupons.service';
import type { CreateCouponDto } from '../coupons/coupons.service';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';

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
  @Max(1000)
  limit?: number = 20;
}

class OrdersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;
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

class QuizQuestionDto {
  @IsString()
  question: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  options: string[];

  @IsInt()
  @Min(0)
  correctIndex: number;
}

class CreateQuizDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];
}

class UpdateQuizDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions?: QuizQuestionDto[];
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
  getCourse(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.instructorService.getCourseById(id, user._id.toString(), false);
  }

  @Get('courses/:id/curriculum')
  @ApiOperation({ summary: 'Curriculum curs (include răspunsuri corecte pentru editor)' })
  async getCurriculum(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    await this.instructorService.getCourseById(id, user._id.toString(), false);
    return this.coursesService.getCurriculum(id, true);
  }

  @Post('courses')
  @ApiOperation({ summary: 'Creare curs nou' })
  createCourse(@Body() dto: CreateCourseDto, @CurrentUser() user: any) {
    return this.coursesService.create(dto, user._id.toString());
  }

  @Patch('courses/:id')
  @ApiOperation({ summary: 'Actualizare curs' })
  updateCourse(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: Partial<CreateCourseDto>,
    @CurrentUser() user: any,
  ) {
    return this.coursesService.update(id, dto, user._id.toString(), false);
  }

  @Patch('courses/:id/publish')
  @ApiOperation({ summary: 'Toggle publicare curs' })
  togglePublish(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.instructorService.togglePublish(id, user._id.toString(), false);
  }

  @Patch('courses/:id/publish-changes')
  @ApiOperation({ summary: 'Publică modificările în așteptare' })
  publishChanges(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.coursesService.publishPendingChanges(id, user._id.toString(), false);
  }

  @Delete('courses/:id/pending-changes')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Renunță la modificările în așteptare' })
  discardChanges(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: { videoIds?: string[] },
    @CurrentUser() user: any,
  ) {
    return this.coursesService.discardPendingChanges(id, user._id.toString(), false, body?.videoIds ?? []);
  }

  @Put('courses/:id/pending-curriculum')
  @ApiOperation({ summary: 'Salvează curriculumul ca modificări în așteptare' })
  savePendingCurriculum(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: SaveCurriculumDto,
    @CurrentUser() user: any,
  ) {
    return this.coursesService.savePendingCurriculum(id, body.curriculum as any, user._id.toString(), false);
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({ summary: 'Comenzile pentru cursurile mele' })
  getMyOrders(@Query() q: OrdersQueryDto, @CurrentUser() user: any) {
    return this.instructorService.getMyOrders(user._id.toString(), q.page, q.limit, {
      status: q.status,
      courseId: q.courseId,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      search: q.search,
    });
  }

  // ── Sections ──────────────────────────────────────────────────────────────

  @Post('courses/:courseId/sections')
  createSection(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @Body() dto: CreateSectionDto,
    @CurrentUser() user: any,
  ) {
    return this.instructorService.createSection(courseId, dto.title, user._id.toString(), false);
  }

  @Patch('sections/:id')
  updateSection(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateSectionDto,
    @CurrentUser() user: any,
  ) {
    return this.instructorService.updateSection(id, dto, user._id.toString(), false);
  }

  @Delete('sections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSection(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.instructorService.deleteSection(id, user._id.toString(), false);
  }

  // ── Lessons ───────────────────────────────────────────────────────────────

  @Post('sections/:sectionId/lessons')
  createLesson(
    @Param('sectionId', ParseObjectIdPipe) sectionId: string,
    @Query('courseId', ParseObjectIdPipe) courseId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser() user: any,
  ) {
    return this.instructorService.createLesson(sectionId, courseId, dto, user._id.toString(), false);
  }

  @Patch('lessons/:id')
  updateLesson(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: Partial<CreateLessonDto>,
    @CurrentUser() user: any,
  ) {
    return this.instructorService.updateLesson(id, dto, user._id.toString(), false);
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLesson(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.instructorService.deleteLesson(id, user._id.toString(), false);
  }

  // ── Quizzes ───────────────────────────────────────────────────────────────

  @Post('courses/:courseId/sections/:sectionId/quizzes')
  createQuiz(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @Param('sectionId', ParseObjectIdPipe) sectionId: string,
    @Body() dto: CreateQuizDto,
    @CurrentUser() user: any,
  ) {
    return this.instructorService.createQuiz(courseId, sectionId, dto, user._id.toString(), false);
  }

  @Patch('courses/:courseId/quizzes/:quizId')
  updateQuiz(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @Param('quizId', ParseObjectIdPipe) quizId: string,
    @Body() dto: UpdateQuizDto,
    @CurrentUser() user: any,
  ) {
    return this.instructorService.updateQuiz(courseId, quizId, dto, user._id.toString(), false);
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
  async createCoupon(@Body() dto: CreateCouponDto, @CurrentUser() user: any) {
    // Validate course ownership — prevent IDOR
    if (dto.courseId) {
      const course = await this.coursesService.findById(dto.courseId);
      if (course.instructorId?.toString() !== user._id.toString()) {
        throw new ForbiddenException('Nu poți crea cupoane pentru cursuri care nu îți aparțin');
      }
    }
    return this.couponsService.createForInstructor(dto, user._id.toString());
  }

  @Patch('coupons/:id')
  @ApiOperation({ summary: 'Actualizează cupon propriu' })
  async updateCoupon(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: Partial<CreateCouponDto>,
    @CurrentUser() user: any,
  ) {
    // Validate course ownership on update too
    if (dto.courseId) {
      const course = await this.coursesService.findById(dto.courseId);
      if (course.instructorId?.toString() !== user._id.toString()) {
        throw new ForbiddenException('Nu poți asocia cupoane la cursuri care nu îți aparțin');
      }
    }
    return this.couponsService.updateForInstructor(id, dto, user._id.toString(), false);
  }

  @Delete('coupons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Șterge cupon propriu' })
  removeCoupon(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.couponsService.removeForInstructor(id, user._id.toString(), false);
  }
}
