import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { CoursesModule } from '../courses/courses.module';
import { CartModule } from '../cart/cart.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    CoursesModule,
    forwardRef(() => CartModule),
    EnrollmentsModule,
    NotificationsModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
