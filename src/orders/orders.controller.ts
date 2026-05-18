import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';

class OrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

class CreateOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Codul de cupon poate avea maxim 50 de caractere' })
  // `+` not `*` — a present-but-empty code is a client bug, not "no coupon".
  // (Service layer also early-returns on empty string, but reject at the edge.)
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Cod de cupon invalid' })
  couponCode?: string;
}

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
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user._id.toString(), dto.couponCode);
  }

  @Post('fake-pay')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor', 'student')
  fakePay(
    @CurrentUser() user: any,
    @Body() dto: CreateOrderDto,
  ) {
    // Block unless NODE_ENV is explicitly 'development'.
    // Checking !== 'development' (not === 'production') ensures that
    // undefined / staging / test all fail secure.
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('Endpoint indisponibil în producție');
    }
    return this.ordersService.createAndPayFake(user._id.toString(), dto.couponCode);
  }

  @Get()
  getMyOrders(@CurrentUser() user: any, @Query() query: OrdersQueryDto) {
    return this.ordersService.getMyOrders(user._id.toString(), query.page, query.limit);
  }

  @Get(':id')
  getOrder(@CurrentUser() user: any, @Param('id', ParseObjectIdPipe) id: string) {
    return this.ordersService.getOrderById(id, user._id.toString());
  }
}
