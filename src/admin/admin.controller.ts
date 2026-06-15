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
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsArray,
  MinLength,
  MaxLength,
  IsEnum,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AdminService } from './admin.service';
import { CoursesService } from '../courses/courses.service';
import { InstructorService } from '../instructor/instructor.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe, ParseOptionalObjectIdPipe } from '../common/pipes/parse-objectid.pipe';
import { CreateCourseDto } from '../courses/dto/create-course.dto';
import { UpdateCourseDto } from '../courses/dto/update-course.dto';
import { SaveCurriculumDto } from '../courses/dto/save-curriculum.dto';

class SetRoleDto {
  @ApiProperty({ enum: ['student', 'instructor', 'admin'] })
  @IsEnum(['student', 'instructor', 'admin'])
  role: string;
}

class SetActiveDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
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

// Tip real (nu `Partial<CreateLessonDto>`, care s-ar șterge în Object și ar
// dezactiva ValidationPipe) — astfel câmpurile din afara DTO sunt respinse.
class UpdateLessonDto extends PartialType(CreateLessonDto) {}

class SetRevenueShareDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  percent: number;
}

class QuizQuestionDto {
  @IsString()
  @MinLength(3, { message: 'Întrebarea trebuie să aibă cel puțin 3 caractere' })
  question: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  options: string[];

  @IsArray()
  @IsInt({ each: true })
  correctIndexes: number[];

  // Note: cross-field validation (correctIndexes < options.length) is enforced in the service
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

class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  // Hard cap on page size — without this an admin (or attacker with admin
  // creds) could request limit=999999 and force the API to materialize
  // entire collections into memory in one shot.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

class AdminUsersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
}

class AdminOrdersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  instructorId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly coursesService: CoursesService,
    private readonly instructorService: InstructorService,
  ) {}

  // ── Stats ──────────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Statistici generale platformă' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('stats/monthly-revenue')
  @ApiOperation({ summary: 'Venituri lunare platformă (ultimele 12 luni)' })
  getMonthlyRevenue() {
    return this.adminService.getMonthlyRevenue();
  }

  // ── Instructors ────────────────────────────────────────────────────────────

  @Get('instructors')
  @ApiOperation({ summary: 'Lista instructorilor' })
  getInstructors(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? Math.max(1, parseInt(page, 10)) : 1;
    const l = limit ? Math.min(100, Math.max(1, parseInt(limit, 10) || 50)) : 50;
    return this.adminService.getInstructors(p, l);
  }

  @Get('instructors/:id/stats')
  @ApiOperation({ summary: 'Statistici instructor specific' })
  getInstructorStats(@Param('id', ParseObjectIdPipe) id: string) {
    return this.instructorService.getMyStats(id);
  }

  @Get('instructors/:id/monthly-revenue')
  @ApiOperation({ summary: 'Venituri lunare instructor specific' })
  getInstructorMonthlyRevenue(@Param('id', ParseObjectIdPipe) id: string) {
    return this.instructorService.getMonthlyRevenue(id);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  getUsers(@Query() q: AdminUsersQueryDto) {
    return this.adminService.getUsers(q.page ?? 1, q.limit ?? 20, q.search);
  }

  @Patch('users/:id/role')
  setRole(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: SetRoleDto,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.setUserRole(id, dto.role, admin._id);
  }

  @Patch('users/:id/revenue-share')
  setRevenueShare(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: SetRevenueShareDto,
  ) {
    return this.adminService.setRevenueShare(id, dto.percent);
  }

  @Patch('users/:id/active')
  setActive(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: SetActiveDto,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.setUserActive(id, dto.isActive, admin._id);
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  @Get('orders')
  getOrders(@Query() q: AdminOrdersQueryDto) {
    return this.adminService.getOrders(q.page ?? 1, q.limit ?? 20, {
      status: q.status,
      instructorId: q.instructorId,
      courseId: q.courseId,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
    });
  }

  @Patch('orders/:id/refund')
  refundOrder(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.adminService.refundOrder(id, user._id.toString());
  }

  // ── Courses ──────────────────────────────────────────────────────────────────

  @Get('courses')
  @ApiOperation({ summary: 'Toate cursurile (draft + published)' })
  getAllCourses(@Query() q: PaginationDto) {
    return this.adminService.getAllCourses(q.page ?? 1, q.limit ?? 20);
  }

  @Get('courses-list')
  @ApiOperation({ summary: 'Listă simplificată de cursuri pentru filtre (id + title)' })
  getCoursesList(
    @Query('instructorId', ParseOptionalObjectIdPipe) instructorId?: string,
  ) {
    return this.adminService.getCoursesList(instructorId);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'Un curs după ID (admin)' })
  getCourse(@Param('id', ParseObjectIdPipe) id: string) {
    return this.coursesService.findById(id);
  }

  @Get('courses/:id/curriculum')
  @ApiOperation({ summary: 'Curriculum curs (include răspunsuri corecte pentru editor)' })
  getCurriculum(@Param('id', ParseObjectIdPipe) id: string) {
    return this.coursesService.getCurriculum(id, true);
  }

  @Post('courses')
  @ApiOperation({ summary: 'Creare curs nou' })
  createCourse(@Body() dto: CreateCourseDto, @CurrentUser() user: any) {
    // Admin poate specifica un instructor; dacă nu, cursul e atribuit adminului însuși
    const effectiveInstructorId = dto.instructorId ?? user._id.toString();
    const { instructorId: _removed, ...courseData } = dto;
    return this.coursesService.create(courseData as CreateCourseDto, effectiveInstructorId);
  }

  @Patch('courses/:id')
  updateCourse(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateCourseDto, @CurrentUser() user: any) {
    return this.coursesService.update(id, dto, user._id.toString(), true);
  }

  @Patch('courses/:id/publish')
  togglePublish(@Param('id', ParseObjectIdPipe) id: string) {
    return this.coursesService.togglePublish(id);
  }

  @Patch('courses/:id/publish-changes')
  @ApiOperation({ summary: 'Publică modificările în așteptare' })
  publishChanges(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.coursesService.publishPendingChanges(id, user._id.toString(), true);
  }

  @Delete('courses/:id/pending-changes')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Renunță la modificările în așteptare' })
  discardChanges(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: { videoIds?: string[] },
    @CurrentUser() user: any,
  ) {
    return this.coursesService.discardPendingChanges(id, user._id.toString(), true, body?.videoIds ?? []);
  }

  @Put('courses/:id/pending-curriculum')
  @ApiOperation({ summary: 'Salvează curriculumul ca modificări în așteptare' })
  savePendingCurriculum(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: SaveCurriculumDto,
    @CurrentUser() user: any,
  ) {
    return this.coursesService.savePendingCurriculum(id, body.curriculum as any, user._id.toString(), true);
  }

  @Delete('courses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCourse(@Param('id', ParseObjectIdPipe) id: string) {
    return this.coursesService.delete(id);
  }

  // ── Sections ──────────────────────────────────────────────────────────────

  @Post('courses/:courseId/sections')
  createSection(@Param('courseId', ParseObjectIdPipe) courseId: string, @Body() dto: CreateSectionDto) {
    return this.coursesService.createSection(courseId, dto.title);
  }

  @Patch('sections/:id')
  updateSection(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateSectionDto) {
    return this.coursesService.updateSection(id, dto);
  }

  @Delete('sections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSection(@Param('id', ParseObjectIdPipe) id: string) {
    return this.coursesService.deleteSection(id);
  }

  // ── Lessons ──────────────────────────────────────────────────────────────

  @Post('sections/:sectionId/lessons')
  createLesson(
    @Param('sectionId', ParseObjectIdPipe) sectionId: string,
    @Query('courseId', ParseObjectIdPipe) courseId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.coursesService.createLesson(sectionId, courseId, dto);
  }

  @Patch('lessons/:id')
  updateLesson(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateLessonDto) {
    return this.coursesService.updateLesson(id, dto);
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLesson(@Param('id', ParseObjectIdPipe) id: string) {
    return this.coursesService.deleteLesson(id);
  }

  // ── Quizzes ──────────────────────────────────────────────────────────────

  @Post('courses/:courseId/sections/:sectionId/quizzes')
  createQuiz(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @Param('sectionId', ParseObjectIdPipe) sectionId: string,
    @Body() dto: CreateQuizDto,
  ) {
    return this.coursesService.createQuiz(courseId, sectionId, dto);
  }

  @Patch('courses/:courseId/quizzes/:quizId')
  updateQuiz(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @Param('quizId', ParseObjectIdPipe) quizId: string,
    @Body() dto: UpdateQuizDto,
  ) {
    return this.coursesService.updateQuiz(quizId, courseId, dto);
  }
}
