import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleId1780000000000 implements MigrationInterface {
  name = 'AddGoogleId1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS "googleId" VARCHAR UNIQUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS "googleId"`);
  }
}
