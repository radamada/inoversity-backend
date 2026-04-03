import { Controller, Get, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getMyNotifications(@Request() req: any, @Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 20;
    const capped = Math.min(Math.max(1, isNaN(parsed) ? 20 : parsed), 100);
    return this.notificationsService.getForUser(req.user._id, capped);
  }

  @Patch('read-all')
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user._id);
  }

  @Patch(':id/read')
  markRead(@Request() req: any, @Param('id', ParseObjectIdPipe) id: string) {
    return this.notificationsService.markRead(req.user._id, id);
  }
}
