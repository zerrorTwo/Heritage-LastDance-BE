import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LeaderboardController } from './controller';
import { LeaderboardService } from './service';

describe('LeaderboardController', () => {
  let controller: LeaderboardController;
  let leaderboardService: jest.Mocked<LeaderboardService>;

  const mockLeaderboard = {
    id: 'lb-1',
    heritageId: 'heritage-1',
    totalParticipants: 2,
    highestScore: 95,
    averageScore: 80,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    rankings: [
      {
        id: 'entry-1',
        leaderboardId: 'lb-1',
        userId: 'user-1',
        score: 95,
        rank: 1,
        avatar: null,
        displayName: 'Alice',
        completedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
  };

  beforeEach(async () => {
    // Arrange — chuẩn bị mock service & module test
    const mockLeaderboardService = {
      getAll: jest.fn(),
      createNew: jest.fn(),
      getLeaderBoardById: jest.fn(),
      updateLeaderBoard: jest.fn(),
      deleteLeaderBoard: jest.fn(),
      getByHeritageId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaderboardController],
      providers: [
        { provide: LeaderboardService, useValue: mockLeaderboardService },
      ],
    }).compile();

    controller = module.get<LeaderboardController>(LeaderboardController);
    leaderboardService = module.get(LeaderboardService);

    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should call service.getAll with query and return Response.OK', async () => {
      // Arrange
      const query: any = { page: 1, limit: 20 };
      const serviceResult = {
        leaderBoards: [mockLeaderboard],
        pagination: {
          totalItems: 1,
          currentPage: 1,
          totalPages: 1,
          itemsPerPage: 20,
        },
      };
      leaderboardService.getAll.mockResolvedValue(serviceResult as any);

      // Act
      const result = await controller.getAll(query);

      // Assert
      expect(leaderboardService.getAll).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: serviceResult });
    });

    it('should propagate service error', async () => {
      // Arrange
      leaderboardService.getAll.mockRejectedValue(new Error('DB down'));

      // Act & Assert
      await expect(controller.getAll({} as any)).rejects.toThrow('DB down');
    });
  });

  describe('POST /', () => {
    it('should call service.createNew and return Response.Created', async () => {
      // Arrange
      const dto: any = {
        heritageId: 'heritage-1',
        rankings: [{ userId: 'user-1', score: 95 }],
      };
      leaderboardService.createNew.mockResolvedValue(mockLeaderboard as any);

      // Act
      const result = await controller.createNew(dto);

      // Assert
      expect(leaderboardService.createNew).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ data: mockLeaderboard });
    });

    it('should propagate BadRequestException from service', async () => {
      // Arrange
      leaderboardService.createNew.mockRejectedValue(
        new Error('rankings phải có ít nhất 1 phần tử'),
      );

      // Act & Assert
      await expect(
        controller.createNew({ heritageId: 'h1', rankings: [] } as any),
      ).rejects.toThrow('rankings phải có ít nhất 1 phần tử');
    });
  });

  describe('GET /heritage/:heritageId', () => {
    it('should call service.getByHeritageId with heritageId and query', async () => {
      // Arrange
      const query: any = { page: 1, limit: 20 };
      const serviceResult = {
        rankings: mockLeaderboard.rankings,
        stats: {
          totalParticipants: 2,
          highestScore: 95,
          averageScore: 80,
        },
        pagination: { page: 1, limit: 20, totalPages: 1, totalItems: 1 },
      };
      leaderboardService.getByHeritageId.mockResolvedValue(serviceResult as any);

      // Act
      const result = await controller.getByHeritage('heritage-1', query);

      // Assert
      expect(leaderboardService.getByHeritageId).toHaveBeenCalledWith(
        'heritage-1',
        query,
      );
      expect(result).toEqual({ data: serviceResult });
    });

    it('should propagate NotFoundException when leaderboard not found', async () => {
      // Arrange
      leaderboardService.getByHeritageId.mockRejectedValue(
        new NotFoundException('Leaderboard not found!'),
      );

      // Act & Assert
      await expect(
        controller.getByHeritage('nonexistent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /:id', () => {
    it('should call service.getLeaderBoardById and return Response.OK', async () => {
      // Arrange
      leaderboardService.getLeaderBoardById.mockResolvedValue(
        mockLeaderboard as any,
      );

      // Act
      const result = await controller.getById('lb-1');

      // Assert
      expect(leaderboardService.getLeaderBoardById).toHaveBeenCalledWith('lb-1');
      expect(result).toEqual({ data: mockLeaderboard });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      leaderboardService.getLeaderBoardById.mockRejectedValue(
        new NotFoundException('Leader Board not found!'),
      );

      // Act & Assert
      await expect(controller.getById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PUT /:id', () => {
    it('should call service.updateLeaderBoard with id and dto', async () => {
      // Arrange
      const dto: any = {
        rankings: [{ userId: 'user-1', score: 100 }],
      };
      leaderboardService.updateLeaderBoard.mockResolvedValue(
        mockLeaderboard as any,
      );

      // Act
      const result = await controller.update('lb-1', dto);

      // Assert
      expect(leaderboardService.updateLeaderBoard).toHaveBeenCalledWith(
        'lb-1',
        dto,
      );
      expect(result).toEqual({ data: mockLeaderboard });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      leaderboardService.updateLeaderBoard.mockRejectedValue(
        new NotFoundException('Leader Board not found!'),
      );

      // Act & Assert
      await expect(
        controller.update('nonexistent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /:id', () => {
    it('should call service.deleteLeaderBoard and return Response.OK', async () => {
      // Arrange
      const deleteResult = { message: 'Leaderboard deleted successfully' };
      leaderboardService.deleteLeaderBoard.mockResolvedValue(deleteResult);

      // Act
      const result = await controller.delete('lb-1');

      // Assert
      expect(leaderboardService.deleteLeaderBoard).toHaveBeenCalledWith('lb-1');
      expect(result).toEqual({ data: deleteResult });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      leaderboardService.deleteLeaderBoard.mockRejectedValue(
        new NotFoundException('LeaderBoard not found'),
      );

      // Act & Assert
      await expect(controller.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
