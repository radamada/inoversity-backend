import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { Enrollment, EnrollmentSchema } from '../enrollments/schemas/enrollment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
    ]),
  ],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
