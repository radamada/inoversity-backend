import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Cart, CartSchema } from './schemas/cart.schema';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
    CoursesModule,
    forwardRef(() => EnrollmentsModule),
  ],
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
