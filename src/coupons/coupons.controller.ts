import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseFloatPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CouponsService, CreateCouponDto, UpdateCouponDto } from './coupons.service';
// NOTE: CreateCouponDto must be a VALUE import (not `import type`) so NestJS
// can read its class-validator metadata at runtime. Type-only imports get
// stripped by tsc, leaving ValidationPipe with no schema → it rejects every
// body property as "should not exist".
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  /**
   * Public endpoint — validate a coupon code against an order total.
   * Rate-limited to prevent brute-force enumeration.
   */
  @Get('validate/:code')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  validate(
    @Param('code') code: string,
    @Query('total', new DefaultValuePipe(0), ParseFloatPipe) total: number,
  ) {
    return this.couponsService.validate(code, total);
  }

  // ── Admin endpoints ────────────────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.couponsService.findAll();
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.couponsService.remove(id);
  }
}
