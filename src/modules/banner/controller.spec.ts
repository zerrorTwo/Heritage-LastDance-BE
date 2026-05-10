import { Test, TestingModule } from '@nestjs/testing';
import { BannerController } from './controller';
import { BannerService } from './service';

const mockBanner = (overrides: Record<string, unknown> = {}) => ({
  id: 'banner-1',
  type: 'homepage',
  title: 'Summer Sale',
  description: 'Big discount',
  imageUrl: 'https://example.com/banner.jpg',
  mobileImageUrl: null,
  linkUrl: 'https://example.com/promo',
  clickAction: 'redirect',
  position: 'top',
  priority: 10,
  startAt: new Date('2026-05-01T00:00:00.000Z'),
  endAt: new Date('2026-06-01T23:59:59.000Z'),
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
});

describe('BannerController', () => {
  let controller: BannerController;
  let bannerService: BannerService;

  const mockBannerService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByType: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BannerController],
      providers: [{ provide: BannerService, useValue: mockBannerService }],
    }).compile();

    controller = module.get<BannerController>(BannerController);
    bannerService = module.get<BannerService>(BannerService);
  });

  describe('findAll', () => {
    it('should return all banners with OK response', async () => {
      const banners = [mockBanner()];
      mockBannerService.findAll.mockResolvedValue(banners);

      const result = await controller.findAll();

      expect(bannerService.findAll).toHaveBeenCalledWith(false);
      expect(result).toEqual({ data: banners });
    });

    it('should pass activeOnly=true when query param is "true"', async () => {
      const banners = [mockBanner()];
      mockBannerService.findAll.mockResolvedValue(banners);

      const result = await controller.findAll('true');

      expect(bannerService.findAll).toHaveBeenCalledWith(true);
      expect(result).toEqual({ data: banners });
    });

    it('should pass activeOnly=false when query param is not "true"', async () => {
      const banners = [mockBanner()];
      mockBannerService.findAll.mockResolvedValue(banners);

      const result = await controller.findAll('false');

      expect(bannerService.findAll).toHaveBeenCalledWith(false);
      expect(result).toEqual({ data: banners });
    });

    it('should pass activeOnly=false when query param is undefined', async () => {
      const banners = [mockBanner()];
      mockBannerService.findAll.mockResolvedValue(banners);

      const result = await controller.findAll(undefined);

      expect(bannerService.findAll).toHaveBeenCalledWith(false);
      expect(result).toEqual({ data: banners });
    });
  });

  describe('findByType', () => {
    it('should return banners filtered by type', async () => {
      const banners = [mockBanner({ type: 'homepage' })];
      mockBannerService.findByType.mockResolvedValue(banners);

      const result = await controller.findByType('homepage');

      expect(bannerService.findByType).toHaveBeenCalledWith('homepage', false);
      expect(result).toEqual({ data: banners });
    });

    it('should pass activeOnly when provided', async () => {
      const banners = [mockBanner()];
      mockBannerService.findByType.mockResolvedValue(banners);

      const result = await controller.findByType('ads', 'true');

      expect(bannerService.findByType).toHaveBeenCalledWith('ads', true);
      expect(result).toEqual({ data: banners });
    });
  });

  describe('findById', () => {
    it('should return banner by id with OK response', async () => {
      const banner = mockBanner();
      mockBannerService.findById.mockResolvedValue(banner);

      const result = await controller.findById('banner-1');

      expect(bannerService.findById).toHaveBeenCalledWith('banner-1');
      expect(result).toEqual({ data: banner });
    });
  });

  describe('create', () => {
    it('should create banner and return Created response', async () => {
      const dto = {
        type: 'homepage',
        title: 'New Banner',
        imageUrl: 'https://example.com/img.jpg',
      };
      const created = mockBanner(dto);
      mockBannerService.create.mockResolvedValue(created);

      const result = await controller.create(dto as any, {});

      expect(bannerService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ data: created });
    });
  });

  describe('update', () => {
    it('should update banner and return OK response', async () => {
      const dto = { title: 'Updated Title' };
      const updated = mockBanner({ title: 'Updated Title' });
      mockBannerService.update.mockResolvedValue(updated);

      const result = await controller.update('banner-1', dto as any);

      expect(bannerService.update).toHaveBeenCalledWith('banner-1', dto);
      expect(result).toEqual({ data: updated });
    });
  });

  describe('delete', () => {
    it('should delete banner and return NoContent response', async () => {
      mockBannerService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('banner-1');

      expect(bannerService.delete).toHaveBeenCalledWith('banner-1');
      expect(result).toEqual({ data: null });
    });
  });
});
