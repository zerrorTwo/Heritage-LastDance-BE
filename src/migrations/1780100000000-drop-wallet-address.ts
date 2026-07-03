import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropWalletAddress1780100000000 implements MigrationInterface {
  name = 'DropWalletAddress1780100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS "walletAddress"`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS wallet_address`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "walletAddress" VARCHAR`);
  }
}
