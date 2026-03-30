import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  getMyWishlist(@CurrentUser() user: any) {
    return this.wishlistService.getMyWishlist(user._id.toString());
  }

  @Post(':courseId')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @HttpCode(HttpStatus.OK)
  addToWishlist(
    @CurrentUser() user: any,
    @Param('courseId') courseId: string,
  ) {
    return this.wishlistService.addToWishlist(user._id.toString(), courseId);
  }

  @Delete(':courseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFromWishlist(
    @CurrentUser() user: any,
    @Param('courseId') courseId: string,
  ) {
    return this.wishlistService.removeFromWishlist(user._id.toString(), courseId);
  }
}
