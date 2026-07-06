import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHeritageTables1746500000000 implements MigrationInterface {
  name = 'CreateHeritageTables1746500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable database extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);

    // Create heritage_items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS heritage_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        content TEXT,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        published_at TIMESTAMP,
        seo_title VARCHAR(255),
        seo_description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        search_vector tsvector
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_heritage_items_slug ON heritage_items(slug)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_heritage_items_status ON heritage_items(status)`);

    // Create heritage_translations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS heritage_translations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        heritage_id UUID REFERENCES heritage_items(id) ON DELETE CASCADE,
        language_code VARCHAR(10) NOT NULL,
        title VARCHAR(255),
        summary TEXT,
        content TEXT,
        UNIQUE (heritage_id, language_code)
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_heritage_translations_lang ON heritage_translations(language_code)`);

    // Create heritage_media table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS heritage_media (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        heritage_id UUID REFERENCES heritage_items(id) ON DELETE CASCADE,
        type VARCHAR(50),
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        caption TEXT,
        credit VARCHAR(255),
        sort_order INT DEFAULT 0
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_heritage_media_heritage ON heritage_media(heritage_id)`);

    // Create heritage_locations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS heritage_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        heritage_id UUID REFERENCES heritage_items(id) ON DELETE CASCADE,
        name VARCHAR(255),
        latitude DECIMAL(9,6),
        longitude DECIMAL(9,6),
        address TEXT,
        country_code VARCHAR(10)
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_heritage_locations_geo ON heritage_locations(latitude, longitude)`);

    // Create categories table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255),
        slug VARCHAR(255) UNIQUE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_category_slug ON categories(slug)`);

    // Create heritage_category_map table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS heritage_category_map (
        heritage_id UUID REFERENCES heritage_items(id) ON DELETE CASCADE,
        category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (heritage_id, category_id)
      )
    `);

    // Create heritage_timelines table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS heritage_timelines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        heritage_id UUID REFERENCES heritage_items(id) ON DELETE CASCADE,
        event_date DATE,
        description TEXT
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_timeline_date ON heritage_timelines(event_date)`);

    // Create heritage_relations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS heritage_relations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_id UUID REFERENCES heritage_items(id) ON DELETE CASCADE,
        to_id UUID REFERENCES heritage_items(id) ON DELETE CASCADE,
        relation_type VARCHAR(50)
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_relations_from ON heritage_relations(from_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_relations_to ON heritage_relations(to_id)`);

    // Create full-text search index
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_heritage_search ON heritage_items USING GIN(search_vector)`);

    // Create trigger function for full-text search
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_search_vector()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := to_tsvector('simple', coalesce(NEW.title,'') || ' ' || coalesce(NEW.summary,''));
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE OR REPLACE TRIGGER tsvector_update
      BEFORE INSERT OR UPDATE ON heritage_items
      FOR EACH ROW EXECUTE FUNCTION update_search_vector()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS tsvector_update ON heritage_items`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_search_vector()`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_heritage_search`);
    await queryRunner.query(`DROP TABLE IF EXISTS heritage_relations`);
    await queryRunner.query(`DROP TABLE IF EXISTS heritage_timelines`);
    await queryRunner.query(`DROP TABLE IF EXISTS heritage_category_map`);
    await queryRunner.query(`DROP TABLE IF EXISTS categories`);
    await queryRunner.query(`DROP TABLE IF EXISTS heritage_locations`);
    await queryRunner.query(`DROP TABLE IF EXISTS heritage_media`);
    await queryRunner.query(`DROP TABLE IF EXISTS heritage_translations`);
    await queryRunner.query(`DROP TABLE IF EXISTS heritage_items`);
  }
}
