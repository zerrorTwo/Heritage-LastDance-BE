import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  KnowledgeTestAttemptRepository,
  KnowledgeTestOptionRepository,
  KnowledgeTestQuestionRepository,
  KnowledgeTestRepository,
} from './repository';
import { UserModel } from '../user/model';
import { HeritageItem } from '../heritage/model';
import {
  AddOptionDto,
  AddQuestionDto,
  CreateKnowledgeTestDto,
  GetTestsQueryDto,
  SubmitAttemptDto,
  UpdateKnowledgeTestBasicDto,
  UpdateOptionDto,
  UpdateQuestionDto,
} from './dto/knowledge-test.dto';
import { LeaderboardService } from '../leaderboard/service';

@Injectable()
export class KnowledgeTestService {
  constructor(
    private readonly testRepo: KnowledgeTestRepository,
    private readonly questionRepo: KnowledgeTestQuestionRepository,
    private readonly optionRepo: KnowledgeTestOptionRepository,
    private readonly attemptRepo: KnowledgeTestAttemptRepository,
    private readonly leaderboardService: LeaderboardService,
    @InjectRepository(UserModel)
    private readonly userRepo: Repository<UserModel>,
    @InjectRepository(HeritageItem)
    private readonly heritageRepo: Repository<HeritageItem>,
  ) {}

  // =================== Test CRUD ===================

  async createTest(dto: CreateKnowledgeTestDto) {
    const test = await this.testRepo.create({
      heritageId: dto.heritageId,
      title: dto.title,
      content: dto.content,
      topPerformersLimit: dto.topPerformersLimit ?? 10,
    });

    if (dto.questions?.length) {
      for (let i = 0; i < dto.questions.length; i++) {
        const q = dto.questions[i];
        const question = await this.questionRepo.create({
          testId: test.id,
          content: q.content,
          explanation: q.explanation ?? null,
          image: q.image ?? null,
          position: i + 1,
        });

        await this.optionRepo.bulkCreate(
          q.options.map((o, idx) => ({
            questionId: question.id,
            optionText: o.optionText,
            isCorrect: o.isCorrect,
            position: idx + 1,
          })),
        );
      }
    }

    return this.getTestById(test.id);
  }

  async getTests(query: GetTestsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { results, total } = await this.testRepo.findList({
      page,
      limit,
      status: query.status,
      title: query.title,
    });

    // Kèm tên di sản cho trang admin (heritage có thể đã bị xóa → null)
    const heritageIds = [...new Set(results.map((t) => t.heritageId))];
    const heritages = heritageIds.length
      ? await this.heritageRepo.find({
          where: { id: In(heritageIds) },
          select: ['id', 'title'],
        })
      : [];
    const heritageNameById = new Map(heritages.map((h) => [h.id, h.title]));

    return {
      results: results.map((test) => ({
        ...test,
        _id: test.id,
        heritageName: heritageNameById.get(test.heritageId) ?? null,
      })),
      totalCount: total,
      pagination: {
        totalItems: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        itemsPerPage: limit,
      },
    };
  }

  async getTestById(id: string, includeAnswers = false) {
    const test = await this.testRepo.findById(id);
    if (!test) throw new NotFoundException('Không tìm thấy bài kiểm tra');

    const questions = await this.questionRepo.findByTestId(id);
    const questionIds = questions.map((q) => q.id);
    const allOptions = await this.optionRepo.findByQuestionIds(questionIds);

    const optionsByQuestion = new Map<string, typeof allOptions>();
    for (const opt of allOptions) {
      const arr = optionsByQuestion.get(opt.questionId) ?? [];
      arr.push(opt);
      optionsByQuestion.set(opt.questionId, arr);
    }

    // Mặc định strip isCorrect để client làm bài không thấy đáp án;
    // trang admin edit truyền includeAnswers=true để giữ lại
    const stripOption = (opt: any) => {
      const { isCorrect, ...rest } = opt;
      return {
        ...(includeAnswers ? opt : rest),
        _id: opt.id,
        optionId: opt.id,
      };
    };

    return {
      ...test,
      _id: test.id,
      averageScore: Number(test.averageScore),
      questions: questions.map((q) => ({
        ...q,
        _id: q.id,
        questionId: q.id,
        options: (optionsByQuestion.get(q.id) ?? []).map(stripOption),
      })),
    };
  }

  async updateTest(id: string, dto: UpdateKnowledgeTestBasicDto) {
    const test = await this.testRepo.findById(id);
    if (!test) throw new NotFoundException('Không tìm thấy bài kiểm tra');

    const { questions, ...basic } = dto;
    if (Object.keys(basic).length > 0) {
      await this.testRepo.update(id, basic);
    }

    // Trang admin Update gửi replace-all: tạo lại toàn bộ câu hỏi theo payload
    // (câu hỏi bị xóa trên UI chỉ vắng mặt trong payload, không có lệnh DELETE riêng)
    if (questions) {
      await this.questionRepo.deleteByTestId(id);
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const question = await this.questionRepo.create({
          testId: id,
          content: q.content,
          explanation: q.explanation ?? null,
          image: q.image ?? null,
          position: i + 1,
        });

        await this.optionRepo.bulkCreate(
          q.options.map((o, idx) => ({
            questionId: question.id,
            optionText: o.optionText,
            isCorrect: o.isCorrect,
            position: idx + 1,
          })),
        );
      }
    }

    return this.getTestById(id);
  }

  async deleteTest(id: string) {
    const test = await this.testRepo.findById(id);
    if (!test) throw new NotFoundException('Không tìm thấy bài kiểm tra');

    await this.questionRepo.deleteByTestId(id);
    await this.attemptRepo.deleteByTestId(id);
    await this.testRepo.delete(id);

    return { success: true, message: 'Xóa bài kiểm tra thành công' };
  }

  async getTestsByHeritage(heritageId: string) {
    const results = await this.testRepo.findByHeritageId(heritageId);
    return results.map((test) => ({
      ...test,
      _id: test.id,
    }));
  }

  async updateBasicInfo(id: string, dto: UpdateKnowledgeTestBasicDto) {
    return this.updateTest(id, dto);
  }

  // =================== Submit attempt ===================

  async submitAttempt(
    testId: string,
    userId: string,
    userName: string | null,
    dto: SubmitAttemptDto,
  ) {
    const test = await this.testRepo.findById(testId);
    if (!test) throw new NotFoundException('Không tìm thấy bài kiểm tra');

    // JWT chỉ chứa sub + sessionId nên userName truyền vào luôn null.
    // Tra tên thật từ DB để lưu vào attempt + leaderboard.
    const dbUser = await this.userRepo.findOneBy({ id: userId });
    const resolvedName = dbUser?.displayname || dbUser?.email || userName;

    const questions = await this.questionRepo.findByTestId(testId);
    const questionIds = questions.map((q) => q.id);
    const allOptions = await this.optionRepo.findByQuestionIds(questionIds);

    const correctOptionByQuestion = new Map<string, string[]>();
    for (const opt of allOptions) {
      if (opt.isCorrect) {
        const arr = correctOptionByQuestion.get(opt.questionId) ?? [];
        arr.push(opt.id);
        correctOptionByQuestion.set(opt.questionId, arr);
      }
    }

    let correct = 0;
    const totalQuestions = questions.length;

    for (const answer of dto.answers) {
      const correctIds = correctOptionByQuestion.get(answer.questionId);
      if (!correctIds || correctIds.length === 0) continue;
      // Express cũ: chỉ so optionId đầu tiên. Giữ tương đương.
      if (answer.selectedOptionIds[0] === correctIds[0]) {
        correct++;
      }
    }

    const finalScore =
      totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;

    await this.attemptRepo.create({
      testId,
      userId,
      userName: resolvedName,
      score: finalScore,
      totalQuestions,
      correctAnswers: correct,
    });

    // Recompute stats từ attempts
    const stats = await this.attemptRepo.getStats(testId);
    await this.testRepo.update(testId, {
      totalAttempts: stats.totalAttempts,
      averageScore: parseFloat(stats.averageScore.toFixed(2)),
      highestScore: Math.round(stats.highestScore),
    });

    // Update leaderboard của heritage
    await this.leaderboardService.addOrUpdateEntry(test.heritageId, {
      userId,
      score: finalScore,
      displayName: resolvedName ?? undefined,
      completedAt: new Date(),
    } as any);

    return {
      score: finalScore,
      totalQuestions,
      correctAnswers: correct,
    };
  }

  async getLeaderboard(testId: string) {
    const test = await this.testRepo.findById(testId);
    if (!test) throw new NotFoundException('Không tìm thấy bài kiểm tra');

    const topPerformers = await this.attemptRepo.getTopPerformers(
      testId,
      test.topPerformersLimit,
    );

    return {
      testId: test.id,
      testTitle: test.title,
      stats: {
        totalAttempts: test.totalAttempts,
        averageScore: Number(test.averageScore),
        highestScore: test.highestScore,
      },
      topPerformers,
    };
  }

  // =================== Questions ===================

  async getQuestions(testId: string) {
    const test = await this.testRepo.findById(testId);
    if (!test) throw new NotFoundException('Không tìm thấy bài kiểm tra');

    const questions = await this.questionRepo.findByTestId(testId);
    const questionIds = questions.map((q) => q.id);
    const allOptions = await this.optionRepo.findByQuestionIds(questionIds);

    const byQuestion = new Map<string, typeof allOptions>();
    for (const opt of allOptions) {
      const arr = byQuestion.get(opt.questionId) ?? [];
      arr.push(opt);
      byQuestion.set(opt.questionId, arr);
    }

    return {
      testId: test.id,
      title: test.title,
      questions: questions.map((q) => ({
        ...q,
        _id: q.id,
        questionId: q.id,
        options: (byQuestion.get(q.id) ?? []).map(({ isCorrect, ...rest }) => ({
          ...rest,
          _id: rest.id,
          optionId: rest.id,
        })),
      })),
    };
  }

  async getQuestionById(testId: string, questionId: string) {
    const test = await this.testRepo.findById(testId);
    if (!test) throw new NotFoundException('Không tìm thấy bài kiểm tra');

    const question = await this.questionRepo.findById(questionId);
    if (!question || question.testId !== testId) {
      throw new NotFoundException('Không tìm thấy câu hỏi');
    }

    const options = await this.optionRepo.findByQuestionId(questionId);

    return {
      testId: test.id,
      testTitle: test.title,
      question: {
        ...question,
        _id: question.id,
        questionId: question.id,
        options: options.map(({ isCorrect, ...rest }) => ({
          ...rest,
          _id: rest.id,
          optionId: rest.id,
        })),
      },
    };
  }

  async addQuestion(testId: string, dto: AddQuestionDto) {
    const test = await this.testRepo.findById(testId);
    if (!test) throw new NotFoundException('Không tìm thấy bài kiểm tra');

    const position = await this.questionRepo.getNextPosition(testId);
    const question = await this.questionRepo.create({
      testId,
      content: dto.content,
      explanation: dto.explanation ?? null,
      image: dto.image ?? null,
      position,
    });

    const options = await this.optionRepo.bulkCreate(
      dto.options.map((o, idx) => ({
        questionId: question.id,
        optionText: o.optionText,
        isCorrect: o.isCorrect,
        position: idx + 1,
      })),
    );

    return {
      ...question,
      _id: question.id,
      questionId: question.id,
      options: options.map(opt => ({
        ...opt,
        _id: opt.id,
        optionId: opt.id,
      })),
    };
  }

  async updateQuestion(
    testId: string,
    questionId: string,
    dto: UpdateQuestionDto,
  ) {
    const question = await this.questionRepo.findById(questionId);
    if (!question || question.testId !== testId) {
      throw new NotFoundException('Không tìm thấy câu hỏi');
    }

    const patch: Partial<typeof question> = {};
    if (dto.content !== undefined) patch.content = dto.content;
    if (dto.explanation !== undefined) patch.explanation = dto.explanation;
    if (dto.image !== undefined) patch.image = dto.image;

    if (Object.keys(patch).length > 0) {
      await this.questionRepo.update(questionId, patch);
    }

    if (dto.options) {
      // Replace toàn bộ options (giữ logic Express: gửi options thì thay)
      await this.optionRepo.deleteByQuestionId(questionId);
      await this.optionRepo.bulkCreate(
        dto.options.map((o, idx) => ({
          questionId,
          optionText: o.optionText,
          isCorrect: o.isCorrect,
          position: idx + 1,
        })),
      );
    }

    const updated = await this.questionRepo.findById(questionId);
    const options = await this.optionRepo.findByQuestionId(questionId);
    return {
      ...updated!,
      _id: updated!.id,
      questionId: updated!.id,
      options: options.map(opt => ({
        ...opt,
        _id: opt.id,
        optionId: opt.id,
      })),
    };
  }

  async deleteQuestion(testId: string, questionId: string) {
    const question = await this.questionRepo.findById(questionId);
    if (!question || question.testId !== testId) {
      throw new NotFoundException('Không tìm thấy câu hỏi');
    }

    await this.optionRepo.deleteByQuestionId(questionId);
    await this.questionRepo.delete(questionId);

    return { success: true, message: 'Xóa câu hỏi thành công' };
  }

  // =================== Options ===================

  async getOptions(testId: string, questionId: string) {
    const question = await this.questionRepo.findById(questionId);
    if (!question || question.testId !== testId) {
      throw new NotFoundException('Không tìm thấy câu hỏi');
    }

    const options = await this.optionRepo.findByQuestionId(questionId);
    return {
      testId,
      questionId: question.id,
      questionContent: question.content,
      options: options.map(({ isCorrect, ...rest }) => ({
        ...rest,
        _id: rest.id,
        optionId: rest.id,
      })),
    };
  }

  async addOption(testId: string, questionId: string, dto: AddOptionDto) {
    const question = await this.questionRepo.findById(questionId);
    if (!question || question.testId !== testId) {
      throw new NotFoundException('Không tìm thấy câu hỏi');
    }

    const position = await this.optionRepo.getNextPosition(questionId);
    return this.optionRepo.create({
      questionId,
      optionText: dto.optionText,
      isCorrect: dto.isCorrect,
      position,
    });
  }

  async updateOption(
    testId: string,
    questionId: string,
    optionId: string,
    dto: UpdateOptionDto,
  ) {
    const question = await this.questionRepo.findById(questionId);
    if (!question || question.testId !== testId) {
      throw new NotFoundException('Không tìm thấy câu hỏi');
    }

    const option = await this.optionRepo.findById(optionId);
    if (!option || option.questionId !== questionId) {
      throw new NotFoundException('Không tìm thấy lựa chọn');
    }

    // Ngăn chuyển toàn bộ option về isCorrect=false
    if (dto.isCorrect === false && option.isCorrect === true) {
      const remainingCorrect = await this.optionRepo.countCorrectInQuestion(
        questionId,
        optionId,
      );
      if (remainingCorrect === 0) {
        throw new UnprocessableEntityException(
          'Câu hỏi phải có ít nhất một đáp án đúng',
        );
      }
    }

    const patch: Partial<typeof option> = {};
    if (dto.optionText !== undefined) patch.optionText = dto.optionText;
    if (dto.isCorrect !== undefined) patch.isCorrect = dto.isCorrect;

    return this.optionRepo.update(optionId, patch);
  }

  async deleteOption(
    testId: string,
    questionId: string,
    optionId: string,
  ) {
    const question = await this.questionRepo.findById(questionId);
    if (!question || question.testId !== testId) {
      throw new NotFoundException('Không tìm thấy câu hỏi');
    }

    const option = await this.optionRepo.findById(optionId);
    if (!option || option.questionId !== questionId) {
      throw new NotFoundException('Không tìm thấy lựa chọn');
    }

    if (option.isCorrect) {
      const remainingCorrect = await this.optionRepo.countCorrectInQuestion(
        questionId,
        optionId,
      );
      if (remainingCorrect === 0) {
        throw new BadRequestException(
          'Không thể xóa đáp án đúng cuối cùng của câu hỏi',
        );
      }
    }

    await this.optionRepo.delete(optionId);
    return { success: true, message: 'Xóa lựa chọn thành công' };
  }
}
