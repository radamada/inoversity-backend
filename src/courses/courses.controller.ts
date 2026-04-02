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

  @Get(':slug')
  @ApiOperation({ summary: 'Detalii curs după slug' })
  findOne(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }

  @Get(':id/curriculum')
  @ApiOperation({ summary: 'Curriculum curs (secțiuni + lecții)' })
  getCurriculum(@Param('id', ParseObjectIdPipe) id: string) {
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
