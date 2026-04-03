import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  createOrder(
    @CurrentUser() user: any,
    @Body('couponCode') couponCode?: string,
  ) {
    return this.ordersService.createOrder(user._id.toString(), couponCode);
  }

  @Post('fake-pay')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('admin')
  fakePay(
    @CurrentUser() user: any,
    @Body('couponCode') couponCode?: string,
  ) {
    // Block in production AND when NODE_ENV is not explicitly 'development'
    // (undefined counts as non-dev to fail secure)
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('Endpoint indisponibil în producție');
    }
    return this.ordersService.createAndPayFake(user._id.toString(), couponCode);
  }

  @Get()
  getMyOrders(@CurrentUser() user: any) {
    return this.ordersService.getMyOrders(user._id.toString());
  }

  @Get(':id')
  getOrder(@CurrentUser() user: any, @Param('id', ParseObjectIdPipe) id: string) {
    return this.ordersService.getOrderById(id, user._id.toString());
  }
}
