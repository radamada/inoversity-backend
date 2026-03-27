import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user._id);
  }

  @Patch('me')
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user._id, dto);
  }
}
