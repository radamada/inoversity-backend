import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOrder(@CurrentUser() user: any) {
    return this.ordersService.createOrder(user._id.toString());
  }

  @Post('fake-pay')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('admin')
  fakePay(@CurrentUser() user: any) {
    return this.ordersService.createAndPayFake(user._id.toString());
  }

  @Get()
  getMyOrders(@CurrentUser() user: any) {
    return this.ordersService.getMyOrders(user._id.toString());
  }

  @Get(':id')
  getOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(id, user._id.toString());
  }
}
