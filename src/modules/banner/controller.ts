import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { BannerService } from './service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannerResponseDto } from './dto/banner-response.dto';
import { Response, GeneralResponse } from '../../common/response';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiExtraModels(GeneralResponse, BannerResponseDto)
@Controller('banners')
@ApiTags('Banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all banners',
    description: 'Get all banners. Public endpoint - anyone can view banners.',
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Filter only active banners within schedule',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of banners',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(BannerResponseDto) },
            },
          },
        },
      ],
    },
  })
  async findAll(@Query('activeOnly') activeOnly?: string) {
    const isActiveOnly = activeOnly === 'true';
    const banners = await this.bannerService.findAll(isActiveOnly);
    return Response.OK(banners);
  }

  @Get('type/:type')
  @ApiOperation({
    summary: 'Get banners by type',
    description: 'Get banners filtered by type. Public endpoint.',
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Filter only active banners within schedule',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of banners filtered by type',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(BannerResponseDto) },
            },
          },
        },
      ],
    },
  })
  async findByType(
    @Param('type') type: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const isActiveOnly = activeOnly === 'true';
    const banners = await this.bannerService.findByType(type, isActiveOnly);
    return Response.OK(banners);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get banner by ID',
    description: 'Get a specific banner by ID. Public endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the banner',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(BannerResponseDto) } } },
      ],
    },
  })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async findById(@Param('id') id: string) {
    const banner = await this.bannerService.findById(id);
    return Response.OK(banner);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a new banner',
    description: 'Create a new banner. Admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Banner created successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(BannerResponseDto) } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  async create(@Body() dto: CreateBannerDto, @Req() req: any) {
    const banner = await this.bannerService.create(dto);
    return Response.Created(banner);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update a banner',
    description: 'Update an existing banner. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Banner updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(BannerResponseDto) } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  async update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    const banner = await this.bannerService.update(id, dto);
    return Response.OK(banner);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete a banner',
    description: 'Delete a banner. Admin only.',
  })
  @ApiResponse({ status: 204, description: 'Banner deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async delete(@Param('id') id: string) {
    await this.bannerService.delete(id);
    return Response.NoContent();
  }
}
