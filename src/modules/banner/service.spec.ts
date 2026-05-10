import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BannerService } from './service';
import { BannerRepository } from './repository';

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

describe('BannerService', () => {
  let service: BannerService;
  let bannerRepo: BannerRepository;

  const mockBannerRepo = {
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
      providers: [
        BannerService,
        { provide: BannerRepository, useValue: mockBannerRepo },
      ],
    }).compile();

    service = module.get<BannerService>(BannerService);
    bannerRepo = module.get<BannerRepository>(BannerRepository);
  });

  describe('findAll', () => {
    it('should return all banners when activeOnly is false', async () => {
      const banners = [mockBanner(), mockBanner({ id: 'banner-2' })];
      mockBannerRepo.findAll.mockResolvedValue(banners);

      const result = await service.findAll(false);

      expect(bannerRepo.findAll).toHaveBeenCalledWith(false);
      expect(result).toEqual(banners);
    });

    it('should return active banners when activeOnly is true', async () => {
      const banners = [mockBanner()];
      mockBannerRepo.findAll.mockResolvedValue(banners);

      const result = await service.findAll(true);

      expect(bannerRepo.findAll).toHaveBeenCalledWith(true);
      expect(result).toEqual(banners);
    });

    it('should default activeOnly to false', async () => {
      const banners = [mockBanner()];
      mockBannerRepo.findAll.mockResolvedValue(banners);

      await service.findAll();

      expect(bannerRepo.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('findById', () => {
    it('should return banner when found', async () => {
      const banner = mockBanner();
      mockBannerRepo.findById.mockResolvedValue(banner);

      const result = await service.findById('banner-1');

      expect(bannerRepo.findById).toHaveBeenCalledWith('banner-1');
      expect(result).toEqual(banner);
    });

    it('should throw NotFoundException when banner not found', async () => {
      mockBannerRepo.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByType', () => {
    it('should return banners filtered by type', async () => {
      const banners = [mockBanner({ type: 'homepage' })];
      mockBannerRepo.findByType.mockResolvedValue(banners);

      const result = await service.findByType('homepage', false);

      expect(bannerRepo.findByType).toHaveBeenCalledWith('homepage', false);
      expect(result).toEqual(banners);
    });

    it('should return active banners by type when activeOnly is true', async () => {
      const banners = [mockBanner()];
      mockBannerRepo.findByType.mockResolvedValue(banners);

      const result = await service.findByType('ads', true);

      expect(bannerRepo.findByType).toHaveBeenCalledWith('ads', true);
      expect(result).toEqual(banners);
    });

    it('should default activeOnly to false', async () => {
      mockBannerRepo.findByType.mockResolvedValue([]);

      await service.findByType('popup');

      expect(bannerRepo.findByType).toHaveBeenCalledWith('popup', false);
    });
  });

  describe('create', () => {
    it('should create a banner with string dates converted to Date', async () => {
      const dto = {
        type: 'homepage',
        title: 'New Banner',
        imageUrl: 'https://example.com/img.jpg',
        startAt: '2026-05-10T00:00:00.000Z',
        endAt: '2026-06-10T23:59:59.000Z',
      };
      const createdBanner = mockBanner({
        ...dto,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
      });
      mockBannerRepo.create.mockResolvedValue(createdBanner);

      const result = await service.create(dto as any);

      expect(bannerRepo.create).toHaveBeenCalledWith({
        ...dto,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
      });
      expect(result).toEqual(createdBanner);
    });

    it('should create a banner with null dates when not provided', async () => {
      const dto = {
        type: 'popup',
        imageUrl: 'https://example.com/popup.jpg',
      };
      const createdBanner = mockBanner({
        ...dto,
        startAt: null,
        endAt: null,
      });
      mockBannerRepo.create.mockResolvedValue(createdBanner);

      const result = await service.create(dto as any);

      expect(bannerRepo.create).toHaveBeenCalledWith({
        ...dto,
        startAt: null,
        endAt: null,
      });
      expect(result).toEqual(createdBanner);
    });
  });

  describe('update', () => {
    it('should update all provided fields', async () => {
      const existing = mockBanner();
      const dto = {
        title: 'Updated Title',
        description: 'Updated Description',
        priority: 20,
      };
      mockBannerRepo.findById.mockResolvedValue(existing);
      mockBannerRepo.update.mockResolvedValue(undefined);

      const result = await service.update('banner-1', dto as any);

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated Description');
      expect(result.priority).toBe(20);
      expect(bannerRepo.update).toHaveBeenCalledWith(existing);
    });

    it('should convert string dates to Date objects in update', async () => {
      const existing = mockBanner();
      const dto = {
        startAt: '2026-07-01T00:00:00.000Z',
        endAt: '2026-08-01T23:59:59.000Z',
      };
      mockBannerRepo.findById.mockResolvedValue(existing);
      mockBannerRepo.update.mockResolvedValue(undefined);

      const result = await service.update('banner-1', dto as any);

      expect(result.startAt).toEqual(new Date('2026-07-01T00:00:00.000Z'));
      expect(result.endAt).toEqual(new Date('2026-08-01T23:59:59.000Z'));
      expect(bannerRepo.update).toHaveBeenCalledWith(existing);
    });

    it('should set date fields to null when empty strings provided', async () => {
      const existing = mockBanner();
      const dto = { startAt: '' };
      mockBannerRepo.findById.mockResolvedValue(existing);
      mockBannerRepo.update.mockResolvedValue(undefined);

      const result = await service.update('banner-1', dto as any);

      expect(result.startAt).toBeNull();
    });

    it('should not overwrite fields not provided in dto', async () => {
      const existing = mockBanner();
      const dto = { title: 'Only Title' };
      mockBannerRepo.findById.mockResolvedValue(existing);
      mockBannerRepo.update.mockResolvedValue(undefined);

      const result = await service.update('banner-1', dto as any);

      expect(result.title).toBe('Only Title');
      expect(result.description).toBe(existing.description);
      expect(result.imageUrl).toBe(existing.imageUrl);
      expect(result.priority).toBe(existing.priority);
    });

    it('should throw NotFoundException when banner not found', async () => {
      mockBannerRepo.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { title: 'Test' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an existing banner', async () => {
      const banner = mockBanner();
      mockBannerRepo.findById.mockResolvedValue(banner);
      mockBannerRepo.delete.mockResolvedValue(undefined);

      await service.delete('banner-1');

      expect(bannerRepo.findById).toHaveBeenCalledWith('banner-1');
      expect(bannerRepo.delete).toHaveBeenCalledWith('banner-1');
    });

    it('should throw NotFoundException when banner not found', async () => {
      mockBannerRepo.findById.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      expect(bannerRepo.delete).not.toHaveBeenCalled();
    });
  });
});
