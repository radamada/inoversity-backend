import { Controller, Get, Put, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';
import { IsString, MaxLength } from 'class-validator';

class UpsertNoteDto {
  @IsString()
  @MaxLength(20000)
  content: string;
}

@ApiTags('Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  private async assertEnrolled(userId: string, courseId: string): Promise<void> {
    const enrolled = await this.enrollmentsService.isEnrolled(userId, courseId);
    if (!enrolled) {
      throw new ForbiddenException('Nu ești înscris la acest curs');
    }
  }

  @Get(':courseId/:lessonId')
  async getNote(
    @CurrentUser() user: any,
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @Param('lessonId', ParseObjectIdPipe) lessonId: string,
  ) {
    await this.assertEnrolled(user._id, courseId);
    return this.notesService.getNote(user._id, courseId, lessonId);
  }

  @Put(':courseId/:lessonId')
  async upsertNote(
    @CurrentUser() user: any,
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @Param('lessonId', ParseObjectIdPipe) lessonId: string,
    @Body() dto: UpsertNoteDto,
  ) {
    await this.assertEnrolled(user._id, courseId);
    return this.notesService.upsertNote(user._id, courseId, lessonId, dto.content);
  }

  @Get(':courseId')
  async getCourseNotes(
    @CurrentUser() user: any,
    @Param('courseId', ParseObjectIdPipe) courseId: string,
  ) {
    await this.assertEnrolled(user._id, courseId);
    return this.notesService.getCourseNotes(user._id, courseId);
  }
}
