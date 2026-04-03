import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CourseQueryDto } from './dto/course-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Listare cursuri publicate' })
  findAll(@Query() query: CourseQueryDto) {
    return this.coursesService.findAll(query);
  }

  @Post('lesson-counts')
  @ApiOperation({ summary: 'Get lesson counts for multiple courses (batch)' })
  async getLessonCounts(@Body() body: { courseIds: string[] }) {
    const ids = (body.courseIds ?? []).slice(0, 50); // cap at 50
    return this.coursesService.getLessonCounts(ids);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Detalii curs după slug' })
  findOne(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }

  @Get(':slug/access')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalii curs pentru studenți înscriși (inclusiv cursuri retrase)' })
  findForEnrolled(@Param('slug') slug: string, @CurrentUser() user: any) {
    return this.coursesService.findBySlugForEnrolled(slug, user._id.toString());
  }

  @Get(':id/curriculum')
  @ApiOperation({ summary: 'Curriculum curs (secțiuni + lecții)' })
  async getCurriculum(@Param('id', ParseObjectIdPipe) id: string) {
    // Only expose curriculum for published courses
    const course = await this.coursesService.findById(id);
    if (!course.published) throw new NotFoundException('Cursul nu a fost găsit');
    return this.coursesService.getCurriculum(id);
  }

  @Get(':id/curriculum/enrolled')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Curriculum pentru studenți înscriși (inclusiv cursuri retrase)' })
  async getCurriculumForEnrolled(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const course = await this.coursesService.findById(id);
    if (course.published) return this.coursesService.getCurriculum(id);
    // Unpublished — verify enrollment
    const enrollment = await this.coursesService.checkEnrollment(id, user._id.toString());
    if (!enrollment) throw new NotFoundException('Cursul nu a fost găsit');
    return this.coursesService.getCurriculum(id);
  }

  @Get(':id/also-bought')
  @ApiOperation({ summary: 'Cursuri cumpărate frecvent împreună' })
  getAlsoBought(@Param('id', ParseObjectIdPipe) id: string) {
    return this.coursesService.getAlsoBought(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiBearerAuth()
  create(@Body() dto: CreateCourseDto, @CurrentUser() user: any) {
    return this.coursesService.create(dto, user._id.toString());
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiBearerAuth()
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: Partial<CreateCourseDto>,
    @CurrentUser() user: any,
  ) {
    return this.coursesService.update(id, dto, user._id.toString(), user.role === 'admin');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseObjectIdPipe) id: string) {
    return this.coursesService.delete(id);
  }
}
