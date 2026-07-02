import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRole1779400000000 implements MigrationInterface {
  name = 'AddUserRole1779400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
          CREATE TYPE users_role_enum AS ENUM ('user', 'admin');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role users_role_enum NOT NULL DEFAULT 'user'
    `);

    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS updated_at`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS role`);
    await queryRunner.query(`DROP TYPE IF EXISTS users_role_enum`);
  }
}
