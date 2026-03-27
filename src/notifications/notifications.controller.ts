import { Controller, Get, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getMyNotifications(@Request() req: any, @Query('limit') limit?: string) {
    return this.notificationsService.getForUser(req.user._id, limit ? parseInt(limit) : 20);
  }

  @Patch('read-all')
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user._id);
  }

  @Patch(':id/read')
  markRead(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.markRead(req.user._id, id);
  }
}
