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
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AdminService } from './admin.service';
import { CoursesService } from '../courses/courses.service';
import { InstructorService } from '../instructor/instructor.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';
import { CreateCourseDto } from '../courses/dto/create-course.dto';

class SaveCurriculumDto {
  @IsArray()
  @ArrayMaxSize(500, { message: 'Curriculumul nu poate depăși 500 de elemente' })
  curriculum: any[];
}

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
  getInstructors() {
    return this.adminService.getInstructors();
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
  getUsers(@Query() q: PaginationDto) {
    return this.adminService.getUsers(q.page ?? 1, q.limit ?? 20);
  }

  @Patch('users/:id/role')
  setRole(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: SetRoleDto) {
    return this.adminService.setUserRole(id, dto.role);
  }

  @Patch('users/:id/active')
  setActive(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: SetActiveDto) {
    return this.adminService.setUserActive(id, dto.isActive);
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
  getCoursesList(@Query('instructorId') instructorId?: string) {
    return this.adminService.getCoursesList(instructorId);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'Un curs după ID (admin)' })
  getCourse(@Param('id', ParseObjectIdPipe) id: string) {
    return this.coursesService.findById(id);
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
  updateCourse(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: Partial<CreateCourseDto>, @CurrentUser() user: any) {
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
  discardChanges(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.coursesService.discardPendingChanges(id, user._id.toString(), true);
  }

  @Put('courses/:id/pending-curriculum')
  @ApiOperation({ summary: 'Salvează curriculumul ca modificări în așteptare' })
  savePendingCurriculum(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: SaveCurriculumDto,
    @CurrentUser() user: any,
  ) {
    return this.coursesService.savePendingCurriculum(id, body.curriculum, user._id.toString(), true);
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
  updateLesson(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: Partial<CreateLessonDto>) {
    return this.coursesService.updateLesson(id, dto);
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLesson(@Param('id', ParseObjectIdPipe) id: string) {
    return this.coursesService.deleteLesson(id);
  }
}
