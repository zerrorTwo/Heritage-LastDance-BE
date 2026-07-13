import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeritageItem } from './model';

/**
 * Auto-seed heritage data on first boot when the table is empty.
 * Uses the curated heritage dataset. Idempotent - skips if data already exists.
 */
@Injectable()
export class HeritageSeedBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(HeritageSeedBootstrap.name);

  constructor(
    @InjectRepository(HeritageItem)
    private readonly heritageRepo: Repository<HeritageItem>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const existing = await this.heritageRepo.count();
      if (existing > 0) {
        this.logger.log(`Heritage items already populated (${existing}) — skipping seed.`);
        return;
      }

      this.logger.log('Heritage items empty — importing seed data...');

      const { seedMapHeritageData, readMapHeritageData } = await import(
        '../map-seed/seed-map-data'
      );

      const items = readMapHeritageData();
      const summary = await seedMapHeritageData(items);

      this.logger.log(
        `Heritage seed complete: created=${summary.created} updated=${summary.updated} locations=${summary.locationsCreated}`,
      );
    } catch (err) {
      this.logger.warn(
        `Heritage seed bootstrap failed (non-fatal): ${(err as Error).message}`,
      );
    }
  }
}
