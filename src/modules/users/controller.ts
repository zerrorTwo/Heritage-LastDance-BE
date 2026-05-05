import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { UsersService } from './service';
import { UserResponseDto } from './dto/user-response.dto';
import { newNotFoundError } from '../../common/response/error-factory';

/**
 * UsersController
 *
 * Responsibilities (ONLY):
 *  1. Extract the authenticated user from JWT
 *  2. Call UsersService
 *  3. Return the result
 *
 * No business logic here.
 */
@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getMe(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: UserResponseDto; message: string }> {
    const found = await this.usersService.findById(user.sub);
    if (!found) {
      throw newNotFoundError('User not found');
    }
    return {
      data: found as UserResponseDto,
      message: 'User fetched successfully',
    };
  }
}
