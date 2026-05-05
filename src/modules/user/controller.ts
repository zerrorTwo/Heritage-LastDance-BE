import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { UserService } from './service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getCurrentUser(@Body() req: any) {
    return this.userService.getUserById(req.user.userId);
  }

  @Put('me')
  async updateCurrentUser(@Body() dto: UpdateUserDto, @Body() req: any) {
    return this.userService.updateUser(req.user.userId, dto);
  }
}