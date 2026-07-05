import { BadRequestException, Controller, Get, Post, Put, Delete, Body, Param, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HeritageMediaService } from './service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { CloudinaryProvider } from '../../providers/cloudinary.provider';

@Controller('media')
export class HeritageMediaController {
  constructor(
    private readonly mediaService: HeritageMediaService,
    private readonly cloudinaryProvider: CloudinaryProvider,
  ) {}

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
  async uploadMedia(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Image file is required');

    const uploaded = await this.cloudinaryProvider.uploadStream(file, 'heritage-media');

    return {
      imageUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
    };
  }

  @Get(':id')
  async getMedia(@Param('id') id: string) {
    return this.mediaService.getMediaById(id);
  }

  @Get('heritage/:heritageId')
  async getMediaByHeritage(@Param('heritageId') heritageId: string) {
    return this.mediaService.getMediaByHeritageId(heritageId);
  }

  @Post()
  async createMedia(@Body() dto: CreateMediaDto) {
    return this.mediaService.createMedia(dto);
  }

  @Put(':id')
  async updateMedia(@Param('id') id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.updateMedia(id, dto);
  }

  @Delete(':id')
  async deleteMedia(@Param('id') id: string) {
    return this.mediaService.deleteMedia(id);
  }
}
