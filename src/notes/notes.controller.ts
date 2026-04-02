import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString } from 'class-validator';

class UpsertNoteDto {
  @IsString()
  content: string;
}

@ApiTags('Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get(':courseId/:lessonId')
  getNote(
    @CurrentUser() user: any,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.notesService.getNote(user._id, courseId, lessonId);
  }

  @Put(':courseId/:lessonId')
  upsertNote(
    @CurrentUser() user: any,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpsertNoteDto,
  ) {
    return this.notesService.upsertNote(user._id, courseId, lessonId, dto.content);
  }

  @Get(':courseId')
  getCourseNotes(
    @CurrentUser() user: any,
    @Param('courseId') courseId: string,
  ) {
    return this.notesService.getCourseNotes(user._id, courseId);
  }
}
