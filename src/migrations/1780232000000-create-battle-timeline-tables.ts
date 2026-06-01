import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBattleTimelineTables1780232000000 implements MigrationInterface {
  name = 'CreateBattleTimelineTables1780232000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'battle_timeline_battles_voice_status_enum') THEN
          CREATE TYPE battle_timeline_battles_voice_status_enum AS ENUM ('NONE', 'PENDING', 'READY', 'FAILED');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS battle_timeline_battles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        battle_date VARCHAR(120),
        outcome VARCHAR(40) NOT NULL,
        summary TEXT,
        timeline JSONB NOT NULL,
        user_id VARCHAR(36),
        points_deducted INT DEFAULT 0,
        voice_status battle_timeline_battles_voice_status_enum DEFAULT 'NONE',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_battle_timeline_battles_slug ON battle_timeline_battles(slug)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_battle_timeline_battles_user_id ON battle_timeline_battles(user_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS battle_timeline_quizzes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        battle_id VARCHAR(36) NOT NULL,
        questions JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_battle_timeline_quizzes_battle_id ON battle_timeline_quizzes(battle_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS battle_timeline_voice_scripts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        battle_id VARCHAR(36) NOT NULL,
        step INT NOT NULL,
        script TEXT NOT NULL,
        audio_url VARCHAR(500),
        is_fallback BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_battle_timeline_voice_scripts_battle_step ON battle_timeline_voice_scripts(battle_id, step)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_battle_timeline_voice_scripts_battle_step`);
    await queryRunner.query(`DROP TABLE IF EXISTS battle_timeline_voice_scripts`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_battle_timeline_quizzes_battle_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS battle_timeline_quizzes`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_battle_timeline_battles_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_battle_timeline_battles_slug`);
    await queryRunner.query(`DROP TABLE IF EXISTS battle_timeline_battles`);
    await queryRunner.query(`DROP TYPE IF EXISTS battle_timeline_battles_voice_status_enum`);
  }
}
