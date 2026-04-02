import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class AddToCartDto {
  @ApiProperty()
  @IsString()
  courseId: string;
}

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: any) {
    return this.cartService.getCart(user._id.toString());
  }

  @Post('items')
  addItem(@CurrentUser() user: any, @Body() dto: AddToCartDto) {
    return this.cartService.addItem(user._id.toString(), dto.courseId);
  }

  @Delete('items/:courseId')
  removeItem(@CurrentUser() user: any, @Param('courseId', ParseObjectIdPipe) courseId: string) {
    return this.cartService.removeItem(user._id.toString(), courseId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  clearCart(@CurrentUser() user: any) {
    return this.cartService.clearCart(user._id.toString());
  }
}
