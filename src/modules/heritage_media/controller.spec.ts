import { Test, TestingModule } from '@nestjs/testing';
import { HeritageMediaController } from './controller';
import { HeritageMediaService } from './service';
import { CloudinaryProvider } from '../../providers/cloudinary.provider';

const mockMedia = {
  id: '1',
  heritageId: 'h1',
  url: 'https://example.com/image.jpg',
  type: 'image',
};

describe('HeritageMediaController', () => {
  let controller: HeritageMediaController;
  let service: HeritageMediaService;

  const mockService = {
    getMediaById: jest.fn(),
    getMediaByHeritageId: jest.fn(),
    createMedia: jest.fn(),
    updateMedia: jest.fn(),
    deleteMedia: jest.fn(),
  };

  const mockCloudinaryProvider = {
    uploadStream: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeritageMediaController],
      providers: [
        { provide: HeritageMediaService, useValue: mockService },
        { provide: CloudinaryProvider, useValue: mockCloudinaryProvider },
      ],
    }).compile();

    controller = module.get<HeritageMediaController>(HeritageMediaController);
    service = module.get<HeritageMediaService>(HeritageMediaService);
  });

  describe('uploadMedia', () => {
    it('should upload image to cloudinary and return imageUrl with publicId', async () => {
      const file = { buffer: Buffer.from('test'), mimetype: 'image/png' } as Express.Multer.File;
      mockCloudinaryProvider.uploadStream.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/media.png',
        public_id: 'heritage-media/media',
      });

      const result = await controller.uploadMedia(file);

      expect(mockCloudinaryProvider.uploadStream).toHaveBeenCalledWith(file, 'heritage-media');
      expect(result).toEqual({
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/media.png',
        publicId: 'heritage-media/media',
      });
    });
  });

  describe('getMedia', () => {
    it('should call service.getMediaById with correct id', async () => {
      mockService.getMediaById.mockResolvedValue(mockMedia);

      const result = await controller.getMedia('1');

      expect(service.getMediaById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockMedia);
    });
  });

  describe('getMediaByHeritage', () => {
    it('should call service.getMediaByHeritageId with correct heritageId', async () => {
      mockService.getMediaByHeritageId.mockResolvedValue([mockMedia]);

      const result = await controller.getMediaByHeritage('h1');

      expect(service.getMediaByHeritageId).toHaveBeenCalledWith('h1');
      expect(result).toEqual([mockMedia]);
    });
  });

  describe('createMedia', () => {
    it('should call service.createMedia with dto', async () => {
      const dto = { heritageId: 'h1', url: 'https://example.com/new.jpg', type: 'image' };
      mockService.createMedia.mockResolvedValue({ id: '2', ...dto });

      const result = await controller.createMedia(dto as any);

      expect(service.createMedia).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '2', ...dto });
    });
  });

  describe('updateMedia', () => {
    it('should call service.updateMedia with id and dto', async () => {
      const dto = { url: 'https://example.com/updated.jpg' };
      mockService.updateMedia.mockResolvedValue({ ...mockMedia, ...dto });

      const result = await controller.updateMedia('1', dto as any);

      expect(service.updateMedia).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual({ ...mockMedia, ...dto });
    });
  });

  describe('deleteMedia', () => {
    it('should call service.deleteMedia with correct id', async () => {
      mockService.deleteMedia.mockResolvedValue({ message: 'Media deleted successfully' });

      const result = await controller.deleteMedia('1');

      expect(service.deleteMedia).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Media deleted successfully' });
    });
  });
});
