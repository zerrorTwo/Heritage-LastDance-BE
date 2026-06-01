import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BattleTimelineBattleModel,
  BattleTimelineQuizModel,
  BattleTimelineVoiceScriptModel,
} from './model';

@Injectable()
export class BattleTimelineBattleRepository {
  constructor(
    @InjectRepository(BattleTimelineBattleModel)
    private readonly repo: Repository<BattleTimelineBattleModel>,
  ) {}

  async create(data: Partial<BattleTimelineBattleModel>): Promise<BattleTimelineBattleModel> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findById(id: string): Promise<BattleTimelineBattleModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<BattleTimelineBattleModel | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async findAll(): Promise<BattleTimelineBattleModel[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    data: Partial<BattleTimelineBattleModel>,
  ): Promise<BattleTimelineBattleModel | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }
}

@Injectable()
export class BattleTimelineQuizRepository {
  constructor(
    @InjectRepository(BattleTimelineQuizModel)
    private readonly repo: Repository<BattleTimelineQuizModel>,
  ) {}

  async upsertForBattle(
    battleId: string,
    questions: BattleTimelineQuizModel['questions'],
  ): Promise<BattleTimelineQuizModel> {
    const existing = await this.repo.findOne({ where: { battleId } });
    if (existing) {
      existing.questions = questions;
      return this.repo.save(existing);
    }

    return this.repo.save(this.repo.create({ battleId, questions }));
  }

  async findByBattleId(battleId: string): Promise<BattleTimelineQuizModel | null> {
    return this.repo.findOne({ where: { battleId } });
  }
}

@Injectable()
export class BattleTimelineVoiceScriptRepository {
  constructor(
    @InjectRepository(BattleTimelineVoiceScriptModel)
    private readonly repo: Repository<BattleTimelineVoiceScriptModel>,
  ) {}

  async replaceForBattle(
    battleId: string,
    scripts: Array<Partial<BattleTimelineVoiceScriptModel>>,
  ): Promise<BattleTimelineVoiceScriptModel[]> {
    await this.repo.delete({ battleId });
    const entities = this.repo.create(scripts.map((script) => ({ ...script, battleId })));
    return this.repo.save(entities);
  }

  async findByBattleId(battleId: string): Promise<BattleTimelineVoiceScriptModel[]> {
    return this.repo.find({
      where: { battleId },
      order: { step: 'ASC' },
    });
  }
}
