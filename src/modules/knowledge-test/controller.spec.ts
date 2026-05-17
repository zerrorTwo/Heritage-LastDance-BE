import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { KnowledgeTestController } from './controller';
import { KnowledgeTestService } from './service';
import { KnowledgeTestStatus } from './model';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

describe('KnowledgeTestController', () => {
  let controller: KnowledgeTestController;
  let testService: jest.Mocked<KnowledgeTestService>;

  const mockOption = {
    id: 'opt-1',
    questionId: 'q-1',
    optionText: 'Paris',
    isCorrect: true,
    position: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockQuestion = {
    id: 'q-1',
    testId: 'test-1',
    content: 'Capital of France?',
    explanation: null,
    image: null,
    position: 1,
    options: [mockOption],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockTest = {
    id: 'test-1',
    heritageId: 'heritage-1',
    title: 'Geo Quiz',
    content: 'Geography knowledge test',
    totalAttempts: 0,
    averageScore: 0,
    highestScore: 0,
    topPerformersLimit: 10,
    status: KnowledgeTestStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    questions: [mockQuestion],
  };

  const mockUser: JwtPayload = {
    sub: 'user-1',
    email: 'user@test.com',
    sessionId: 'session-1',
  };

  beforeEach(async () => {
    // Arrange — chuẩn bị mock service & module test
    const mockTestService = {
      createTest: jest.fn(),
      getTests: jest.fn(),
      getTestById: jest.fn(),
      updateTest: jest.fn(),
      updateBasicInfo: jest.fn(),
      deleteTest: jest.fn(),
      getTestsByHeritage: jest.fn(),
      submitAttempt: jest.fn(),
      getLeaderboard: jest.fn(),
      getQuestions: jest.fn(),
      getQuestionById: jest.fn(),
      addQuestion: jest.fn(),
      updateQuestion: jest.fn(),
      deleteQuestion: jest.fn(),
      getOptions: jest.fn(),
      addOption: jest.fn(),
      updateOption: jest.fn(),
      deleteOption: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeTestController],
      providers: [
        { provide: KnowledgeTestService, useValue: mockTestService },
      ],
    }).compile();

    controller = module.get<KnowledgeTestController>(KnowledgeTestController);
    testService = module.get(KnowledgeTestService);

    jest.clearAllMocks();
  });

  // =================== Test CRUD ===================

  describe('POST / (createTest)', () => {
    it('should call service.createTest and return Response.Created', async () => {
      // Arrange
      const dto: any = {
        heritageId: 'heritage-1',
        title: 'Geo Quiz',
        content: 'Content',
        questions: [
          {
            content: 'Q?',
            options: [
              { optionText: 'A', isCorrect: true },
              { optionText: 'B', isCorrect: false },
            ],
          },
        ],
      };
      testService.createTest.mockResolvedValue(mockTest as any);

      // Act
      const result = await controller.createTest(dto);

      // Assert
      expect(testService.createTest).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ data: mockTest });
    });

    it('should propagate service error', async () => {
      // Arrange
      testService.createTest.mockRejectedValue(new Error('DB error'));

      // Act & Assert
      await expect(controller.createTest({} as any)).rejects.toThrow('DB error');
    });
  });

  describe('GET / (getTests)', () => {
    it('should call service.getTests with query and return Response.OK', async () => {
      // Arrange
      const query: any = { page: 1, limit: 20, status: 'ALL' };
      const serviceResult = {
        results: [mockTest],
        totalCount: 1,
        pagination: {
          totalItems: 1,
          currentPage: 1,
          totalPages: 1,
          itemsPerPage: 20,
        },
      };
      testService.getTests.mockResolvedValue(serviceResult as any);

      // Act
      const result = await controller.getTests(query);

      // Assert
      expect(testService.getTests).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: serviceResult });
    });

    it('should propagate service error', async () => {
      // Arrange
      testService.getTests.mockRejectedValue(new Error('DB error'));

      // Act & Assert
      await expect(controller.getTests({} as any)).rejects.toThrow('DB error');
    });
  });

  describe('GET /heritage/:heritageId (getByHeritage)', () => {
    it('should call service.getTestsByHeritage with heritageId', async () => {
      // Arrange
      testService.getTestsByHeritage.mockResolvedValue([mockTest] as any);

      // Act
      const result = await controller.getByHeritage('heritage-1');

      // Assert
      expect(testService.getTestsByHeritage).toHaveBeenCalledWith('heritage-1');
      expect(result).toEqual({ data: [mockTest] });
    });

    it('should return empty array when no tests', async () => {
      // Arrange
      testService.getTestsByHeritage.mockResolvedValue([]);

      // Act
      const result = await controller.getByHeritage('heritage-empty');

      // Assert
      expect(result).toEqual({ data: [] });
    });
  });

  describe('GET /:id (getTestById)', () => {
    it('should call service.getTestById and return Response.OK', async () => {
      // Arrange
      testService.getTestById.mockResolvedValue(mockTest as any);

      // Act
      const result = await controller.getTestById('test-1');

      // Assert
      expect(testService.getTestById).toHaveBeenCalledWith('test-1');
      expect(result).toEqual({ data: mockTest });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.getTestById.mockRejectedValue(
        new NotFoundException('Không tìm thấy bài kiểm tra'),
      );

      // Act & Assert
      await expect(controller.getTestById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PUT /:id (updateTest)', () => {
    it('should call service.updateTest with id and dto', async () => {
      // Arrange
      const dto: any = { title: 'New title' };
      testService.updateTest.mockResolvedValue({ ...mockTest, title: 'New title' } as any);

      // Act
      const result = await controller.updateTest('test-1', dto);

      // Assert
      expect(testService.updateTest).toHaveBeenCalledWith('test-1', dto);
      expect(result).toEqual({ data: { ...mockTest, title: 'New title' } });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.updateTest.mockRejectedValue(
        new NotFoundException('Không tìm thấy bài kiểm tra'),
      );

      // Act & Assert
      await expect(
        controller.updateTest('nonexistent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PUT /:id/basic-info (updateBasicInfo)', () => {
    it('should call service.updateBasicInfo with id and dto', async () => {
      // Arrange
      const dto: any = { title: 'Updated', status: KnowledgeTestStatus.INACTIVE };
      testService.updateBasicInfo.mockResolvedValue(mockTest as any);

      // Act
      const result = await controller.updateBasicInfo('test-1', dto);

      // Assert
      expect(testService.updateBasicInfo).toHaveBeenCalledWith('test-1', dto);
      expect(result).toEqual({ data: mockTest });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.updateBasicInfo.mockRejectedValue(
        new NotFoundException('Không tìm thấy bài kiểm tra'),
      );

      // Act & Assert
      await expect(
        controller.updateBasicInfo('nonexistent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /:id (deleteTest)', () => {
    it('should call service.deleteTest and return Response.OK', async () => {
      // Arrange
      const deleteResult = { success: true, message: 'Xóa bài kiểm tra thành công' };
      testService.deleteTest.mockResolvedValue(deleteResult);

      // Act
      const result = await controller.deleteTest('test-1');

      // Assert
      expect(testService.deleteTest).toHaveBeenCalledWith('test-1');
      expect(result).toEqual({ data: deleteResult });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.deleteTest.mockRejectedValue(
        new NotFoundException('Không tìm thấy bài kiểm tra'),
      );

      // Act & Assert
      await expect(controller.deleteTest('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =================== Submit / Leaderboard ===================

  describe('POST /:id/attempt (submitAttempt)', () => {
    it('should call service.submitAttempt with userId from JwtPayload', async () => {
      // Arrange
      const dto: any = {
        answers: [{ questionId: 'q-1', selectedOptionIds: ['opt-1'] }],
      };
      const submitResult = { score: 100, totalQuestions: 1, correctAnswers: 1 };
      testService.submitAttempt.mockResolvedValue(submitResult);

      // Act
      const result = await controller.submitAttempt('test-1', dto, mockUser);

      // Assert
      expect(testService.submitAttempt).toHaveBeenCalledWith(
        'test-1',
        mockUser.sub,
        mockUser.email,
        dto,
      );
      expect(result).toEqual({ data: submitResult });
    });

    it('should pass null when email is undefined', async () => {
      // Arrange
      const dto: any = { answers: [] };
      const userWithoutEmail: any = { sub: 'user-2', sessionId: 's-2' };
      testService.submitAttempt.mockResolvedValue({
        score: 0,
        totalQuestions: 0,
        correctAnswers: 0,
      });

      // Act
      await controller.submitAttempt('test-1', dto, userWithoutEmail);

      // Assert
      expect(testService.submitAttempt).toHaveBeenCalledWith(
        'test-1',
        'user-2',
        null,
        dto,
      );
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.submitAttempt.mockRejectedValue(
        new NotFoundException('Không tìm thấy bài kiểm tra'),
      );

      // Act & Assert
      await expect(
        controller.submitAttempt('nonexistent', {} as any, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /:id/leaderboard (getLeaderboard)', () => {
    it('should call service.getLeaderboard and return Response.OK', async () => {
      // Arrange
      const lbResult = {
        testId: 'test-1',
        testTitle: 'Geo Quiz',
        stats: { totalAttempts: 5, averageScore: 80, highestScore: 100 },
        topPerformers: [
          {
            userId: 'user-1',
            userName: 'Alice',
            score: 100,
            createdAt: new Date('2024-01-01'),
          },
        ],
      };
      testService.getLeaderboard.mockResolvedValue(lbResult as any);

      // Act
      const result = await controller.getLeaderboard('test-1');

      // Assert
      expect(testService.getLeaderboard).toHaveBeenCalledWith('test-1');
      expect(result).toEqual({ data: lbResult });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.getLeaderboard.mockRejectedValue(
        new NotFoundException('Không tìm thấy bài kiểm tra'),
      );

      // Act & Assert
      await expect(controller.getLeaderboard('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =================== Questions ===================

  describe('GET /:testId/questions (getQuestions)', () => {
    it('should call service.getQuestions and return Response.OK', async () => {
      // Arrange
      const serviceResult = {
        testId: 'test-1',
        title: 'Geo Quiz',
        questions: [mockQuestion],
      };
      testService.getQuestions.mockResolvedValue(serviceResult as any);

      // Act
      const result = await controller.getQuestions('test-1');

      // Assert
      expect(testService.getQuestions).toHaveBeenCalledWith('test-1');
      expect(result).toEqual({ data: serviceResult });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.getQuestions.mockRejectedValue(
        new NotFoundException('Không tìm thấy bài kiểm tra'),
      );

      // Act & Assert
      await expect(controller.getQuestions('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('POST /:testId/questions (addQuestion)', () => {
    it('should call service.addQuestion with testId and dto', async () => {
      // Arrange
      const dto: any = {
        content: 'New question?',
        options: [
          { optionText: 'A', isCorrect: true },
          { optionText: 'B', isCorrect: false },
        ],
      };
      testService.addQuestion.mockResolvedValue(mockQuestion as any);

      // Act
      const result = await controller.addQuestion('test-1', dto);

      // Assert
      expect(testService.addQuestion).toHaveBeenCalledWith('test-1', dto);
      expect(result).toEqual({ data: mockQuestion });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.addQuestion.mockRejectedValue(
        new NotFoundException('Không tìm thấy bài kiểm tra'),
      );

      // Act & Assert
      await expect(
        controller.addQuestion('nonexistent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /:testId/questions/:questionId (getQuestionById)', () => {
    it('should call service.getQuestionById with both ids', async () => {
      // Arrange
      const serviceResult = {
        testId: 'test-1',
        testTitle: 'Geo Quiz',
        question: mockQuestion,
      };
      testService.getQuestionById.mockResolvedValue(serviceResult as any);

      // Act
      const result = await controller.getQuestionById('test-1', 'q-1');

      // Assert
      expect(testService.getQuestionById).toHaveBeenCalledWith('test-1', 'q-1');
      expect(result).toEqual({ data: serviceResult });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.getQuestionById.mockRejectedValue(
        new NotFoundException('Không tìm thấy câu hỏi'),
      );

      // Act & Assert
      await expect(
        controller.getQuestionById('test-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PUT /:testId/questions/:questionId (updateQuestion)', () => {
    it('should call service.updateQuestion with ids and dto', async () => {
      // Arrange
      const dto: any = { content: 'Updated content' };
      testService.updateQuestion.mockResolvedValue({
        ...mockQuestion,
        content: 'Updated content',
      } as any);

      // Act
      const result = await controller.updateQuestion('test-1', 'q-1', dto);

      // Assert
      expect(testService.updateQuestion).toHaveBeenCalledWith(
        'test-1',
        'q-1',
        dto,
      );
      expect(result).toEqual({
        data: { ...mockQuestion, content: 'Updated content' },
      });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.updateQuestion.mockRejectedValue(
        new NotFoundException('Không tìm thấy câu hỏi'),
      );

      // Act & Assert
      await expect(
        controller.updateQuestion('test-1', 'nonexistent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /:testId/questions/:questionId (deleteQuestion)', () => {
    it('should call service.deleteQuestion with ids', async () => {
      // Arrange
      const deleteResult = { success: true, message: 'Xóa câu hỏi thành công' };
      testService.deleteQuestion.mockResolvedValue(deleteResult);

      // Act
      const result = await controller.deleteQuestion('test-1', 'q-1');

      // Assert
      expect(testService.deleteQuestion).toHaveBeenCalledWith('test-1', 'q-1');
      expect(result).toEqual({ data: deleteResult });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.deleteQuestion.mockRejectedValue(
        new NotFoundException('Không tìm thấy câu hỏi'),
      );

      // Act & Assert
      await expect(
        controller.deleteQuestion('test-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =================== Options ===================

  describe('GET /:testId/questions/:questionId/options (getOptions)', () => {
    it('should call service.getOptions with ids', async () => {
      // Arrange
      const serviceResult = {
        testId: 'test-1',
        questionId: 'q-1',
        questionContent: 'Capital of France?',
        options: [mockOption],
      };
      testService.getOptions.mockResolvedValue(serviceResult as any);

      // Act
      const result = await controller.getOptions('test-1', 'q-1');

      // Assert
      expect(testService.getOptions).toHaveBeenCalledWith('test-1', 'q-1');
      expect(result).toEqual({ data: serviceResult });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.getOptions.mockRejectedValue(
        new NotFoundException('Không tìm thấy câu hỏi'),
      );

      // Act & Assert
      await expect(
        controller.getOptions('test-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /:testId/questions/:questionId/options (addOption)', () => {
    it('should call service.addOption with ids and dto', async () => {
      // Arrange
      const dto: any = { optionText: 'C', isCorrect: false };
      testService.addOption.mockResolvedValue(mockOption as any);

      // Act
      const result = await controller.addOption('test-1', 'q-1', dto);

      // Assert
      expect(testService.addOption).toHaveBeenCalledWith('test-1', 'q-1', dto);
      expect(result).toEqual({ data: mockOption });
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.addOption.mockRejectedValue(
        new NotFoundException('Không tìm thấy câu hỏi'),
      );

      // Act & Assert
      await expect(
        controller.addOption('test-1', 'nonexistent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PUT /:testId/questions/:questionId/options/:optionId (updateOption)', () => {
    it('should call service.updateOption with all ids and dto', async () => {
      // Arrange
      const dto: any = { optionText: 'Updated' };
      testService.updateOption.mockResolvedValue({
        ...mockOption,
        optionText: 'Updated',
      } as any);

      // Act
      const result = await controller.updateOption('test-1', 'q-1', 'opt-1', dto);

      // Assert
      expect(testService.updateOption).toHaveBeenCalledWith(
        'test-1',
        'q-1',
        'opt-1',
        dto,
      );
      expect(result).toEqual({
        data: { ...mockOption, optionText: 'Updated' },
      });
    });

    it('should propagate UnprocessableEntityException when removing last correct option', async () => {
      // Arrange
      testService.updateOption.mockRejectedValue(
        new UnprocessableEntityException(
          'Câu hỏi phải có ít nhất một đáp án đúng',
        ),
      );

      // Act & Assert
      await expect(
        controller.updateOption('test-1', 'q-1', 'opt-1', { isCorrect: false } as any),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.updateOption.mockRejectedValue(
        new NotFoundException('Không tìm thấy lựa chọn'),
      );

      // Act & Assert
      await expect(
        controller.updateOption('test-1', 'q-1', 'nonexistent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /:testId/questions/:questionId/options/:optionId (deleteOption)', () => {
    it('should call service.deleteOption with all ids', async () => {
      // Arrange
      const deleteResult = { success: true, message: 'Xóa lựa chọn thành công' };
      testService.deleteOption.mockResolvedValue(deleteResult);

      // Act
      const result = await controller.deleteOption('test-1', 'q-1', 'opt-1');

      // Assert
      expect(testService.deleteOption).toHaveBeenCalledWith(
        'test-1',
        'q-1',
        'opt-1',
      );
      expect(result).toEqual({ data: deleteResult });
    });

    it('should propagate BadRequestException when deleting last correct option', async () => {
      // Arrange
      testService.deleteOption.mockRejectedValue(
        new BadRequestException(
          'Không thể xóa đáp án đúng cuối cùng của câu hỏi',
        ),
      );

      // Act & Assert
      await expect(
        controller.deleteOption('test-1', 'q-1', 'opt-last'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      testService.deleteOption.mockRejectedValue(
        new NotFoundException('Không tìm thấy lựa chọn'),
      );

      // Act & Assert
      await expect(
        controller.deleteOption('test-1', 'q-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
