import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { UserService } from './service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminUpdateUserDto, UpdateUserDto } from './dto/update-user.dto';
import { UserProfileDto } from './dto/user-response.dto';
import { Response, GeneralResponse } from '../../common/response';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CloudinaryProvider } from '../../providers/cloudinary.provider';

@ApiExtraModels(GeneralResponse, UserProfileDto)
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
@ApiBearerAuth('access-token')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly cloudinaryProvider: CloudinaryProvider,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Get the profile of the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the current user profile',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(UserProfileDto) } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  async getCurrentUser(@Req() req: any) {
    const user = await this.userService.getUserById(req.user.userId);
    return Response.OK(user);
  }

  @Put('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Update the profile of the authenticated user',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated user profile',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(UserProfileDto) } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  async updateCurrentUser(@Body() dto: UpdateUserDto, @Req() req: any) {
    const user = await this.userService.updateUser(req.user.userId, dto);
    return Response.OK(user);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'List users',
    description: 'Admin endpoint for user management with search, role filter, sorting, and pagination.',
  })
  async getAllUsers(@Query() query: Record<string, any>) {
    return this.userService.getAllUsers(query);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Admin endpoint for viewing a user profile.',
  })
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Update user by ID',
    description: 'Admin endpoint for updating profile, role, and active status.',
  })
  async updateUserById(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.userService.updateUserByAdmin(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Delete user by ID',
    description: 'Admin endpoint for deleting a user.',
  })
  async deleteUserById(@Param('id') id: string) {
    await this.userService.deleteUser(id);
    return Response.NoContent();
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(new BadRequestException('Invalid image type'), false);
        }
        return callback(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload current user avatar',
    description: 'Uploads an avatar image and returns an imageUrl for profile update',
  })
  async uploadAvatar(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Image file is required');

    const uploaded = await this.cloudinaryProvider.uploadStream(file, 'avatarHeritage');

    return Response.OK({
      imageUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
    });
  }
}
