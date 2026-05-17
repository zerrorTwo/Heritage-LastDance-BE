import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  KnowledgeTestAttemptModel,
  KnowledgeTestModel,
  KnowledgeTestOptionModel,
  KnowledgeTestQuestionModel,
  KnowledgeTestStatus,
} from './model';

@Injectable()
export class KnowledgeTestRepository {
  constructor(
    @InjectRepository(KnowledgeTestModel)
    private readonly repo: Repository<KnowledgeTestModel>,
  ) {}

  async findById(id: string): Promise<KnowledgeTestModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findList(opts: {
    page: number;
    limit: number;
    status?: string;
  }): Promise<{ results: KnowledgeTestModel[]; total: number }> {
    const { page, limit, status } = opts;
    const where =
      status && status !== 'ALL'
        ? { status: status as KnowledgeTestStatus }
        : {};

    const [results, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { results, total };
  }

  async findByHeritageId(heritageId: string): Promise<KnowledgeTestModel[]> {
    return this.repo.find({
      where: { heritageId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<KnowledgeTestModel>): Promise<KnowledgeTestModel> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(
    id: string,
    data: Partial<KnowledgeTestModel>,
  ): Promise<KnowledgeTestModel | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

@Injectable()
export class KnowledgeTestQuestionRepository {
  constructor(
    @InjectRepository(KnowledgeTestQuestionModel)
    private readonly repo: Repository<KnowledgeTestQuestionModel>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<KnowledgeTestQuestionModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByTestId(testId: string): Promise<KnowledgeTestQuestionModel[]> {
    return this.repo.find({
      where: { testId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async create(
    data: Partial<KnowledgeTestQuestionModel>,
  ): Promise<KnowledgeTestQuestionModel> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(
    id: string,
    data: Partial<KnowledgeTestQuestionModel>,
  ): Promise<KnowledgeTestQuestionModel | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async getNextPosition(testId: string): Promise<number> {
    const max = await this.repo
      .createQueryBuilder('q')
      .select('MAX(q.position)', 'max')
      .where('q.testId = :testId', { testId })
      .getRawOne<{ max: number | null }>();
    return (max?.max ?? 0) + 1;
  }

  /** Xóa toàn bộ question (+ option cascade) của 1 test trong transaction */
  async deleteByTestId(testId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const qRepo = manager.getRepository(KnowledgeTestQuestionModel);
      const oRepo = manager.getRepository(KnowledgeTestOptionModel);

      const questions = await qRepo.find({ where: { testId } });
      const questionIds = questions.map((q) => q.id);

      if (questionIds.length > 0) {
        await oRepo
          .createQueryBuilder()
          .delete()
          .from(KnowledgeTestOptionModel)
          .where('questionId IN (:...questionIds)', { questionIds })
          .execute();
      }

      await qRepo.delete({ testId });
    });
  }
}

@Injectable()
export class KnowledgeTestOptionRepository {
  constructor(
    @InjectRepository(KnowledgeTestOptionModel)
    private readonly repo: Repository<KnowledgeTestOptionModel>,
  ) {}

  async findById(id: string): Promise<KnowledgeTestOptionModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByQuestionId(
    questionId: string,
  ): Promise<KnowledgeTestOptionModel[]> {
    return this.repo.find({
      where: { questionId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async findByQuestionIds(
    questionIds: string[],
  ): Promise<KnowledgeTestOptionModel[]> {
    if (questionIds.length === 0) return [];
    return this.repo
      .createQueryBuilder('o')
      .where('o.questionId IN (:...questionIds)', { questionIds })
      .orderBy('o.position', 'ASC')
      .addOrderBy('o.createdAt', 'ASC')
      .getMany();
  }

  async create(
    data: Partial<KnowledgeTestOptionModel>,
  ): Promise<KnowledgeTestOptionModel> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async bulkCreate(
    options: Array<Partial<KnowledgeTestOptionModel>>,
  ): Promise<KnowledgeTestOptionModel[]> {
    if (options.length === 0) return [];
    const entities = this.repo.create(options);
    return this.repo.save(entities);
  }

  async update(
    id: string,
    data: Partial<KnowledgeTestOptionModel>,
  ): Promise<KnowledgeTestOptionModel | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByQuestionId(questionId: string): Promise<void> {
    await this.repo.delete({ questionId });
  }

  async getNextPosition(questionId: string): Promise<number> {
    const max = await this.repo
      .createQueryBuilder('o')
      .select('MAX(o.position)', 'max')
      .where('o.questionId = :questionId', { questionId })
      .getRawOne<{ max: number | null }>();
    return (max?.max ?? 0) + 1;
  }

  async countCorrectInQuestion(
    questionId: string,
    excludeOptionId?: string,
  ): Promise<number> {
    const qb = this.repo
      .createQueryBuilder('o')
      .where('o.questionId = :questionId', { questionId })
      .andWhere('o.isCorrect = true');
    if (excludeOptionId) {
      qb.andWhere('o.id != :excludeOptionId', { excludeOptionId });
    }
    return qb.getCount();
  }
}

@Injectable()
export class KnowledgeTestAttemptRepository {
  constructor(
    @InjectRepository(KnowledgeTestAttemptModel)
    private readonly repo: Repository<KnowledgeTestAttemptModel>,
  ) {}

  async create(
    data: Partial<KnowledgeTestAttemptModel>,
  ): Promise<KnowledgeTestAttemptModel> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async getTopPerformers(
    testId: string,
    limit: number,
  ): Promise<Array<{ userId: string; userName: string | null; score: number; createdAt: Date }>> {
    // Lấy best score mỗi user
    return this.repo
      .createQueryBuilder('a')
      .select('a.userId', 'userId')
      .addSelect('MAX(a.userName)', 'userName')
      .addSelect('MAX(a.score)', 'score')
      .addSelect('MAX(a.createdAt)', 'createdAt')
      .where('a.testId = :testId', { testId })
      .groupBy('a.userId')
      .orderBy('score', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async getStats(
    testId: string,
  ): Promise<{ totalAttempts: number; averageScore: number; highestScore: number }> {
    const row = await this.repo
      .createQueryBuilder('a')
      .select('COUNT(*)', 'totalAttempts')
      .addSelect('AVG(a.score)', 'averageScore')
      .addSelect('MAX(a.score)', 'highestScore')
      .where('a.testId = :testId', { testId })
      .getRawOne<{ totalAttempts: string; averageScore: string | null; highestScore: string | null }>();

    return {
      totalAttempts: parseInt(row?.totalAttempts ?? '0', 10),
      averageScore: row?.averageScore ? parseFloat(row.averageScore) : 0,
      highestScore: row?.highestScore ? parseFloat(row.highestScore) : 0,
    };
  }

  async deleteByTestId(testId: string): Promise<void> {
    await this.repo.delete({ testId });
  }
}
