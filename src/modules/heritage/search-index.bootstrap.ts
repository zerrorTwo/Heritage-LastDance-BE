import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Enables fuzzy (typo + diacritic insensitive) search on heritage_items.
 *
 * Runs once on application bootstrap — i.e. AFTER TypeORM `synchronize` has
 * created/updated the schema — so the trigram indexes are never dropped by the
 * sync pass. Every statement is idempotent, so re-running on each boot is safe.
 *
 * Requirements (available on Neon Postgres):
 *  - unaccent : strips Vietnamese diacritics  ("bach dang" -> matches "Bạch Đằng")
 *  - pg_trgm  : trigram similarity             ("dien bien" -> matches "Điện Biên")
 */
@Injectable()
export class HeritageSearchIndexBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(HeritageSearchIndexBootstrap.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      // 1. Extensions
      await this.dataSource.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
      await this.dataSource.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

      // 1b. Resolve the schemas the extensions actually live in. On managed
      //     Postgres (Neon, etc.) they may not be on the search_path used when
      //     Postgres builds a functional index, so we must schema-qualify
      //     everything explicitly — otherwise the index build fails with
      //     "function unaccent(text) does not exist".
      const unaccentSchema = await this.resolveSchema(
        `SELECT n.nspname AS schema
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE p.proname = 'unaccent'
          ORDER BY (n.nspname = 'public') DESC
          LIMIT 1`,
      );
      const trgmSchema = await this.resolveSchema(
        `SELECT n.nspname AS schema
           FROM pg_opclass o
           JOIN pg_namespace n ON n.oid = o.opcnamespace
          WHERE o.opcname = 'gin_trgm_ops'
          ORDER BY (n.nspname = 'public') DESC
          LIMIT 1`,
      );

      if (!unaccentSchema || !trgmSchema) {
        this.logger.warn(
          'unaccent/pg_trgm not available after CREATE EXTENSION; ' +
            'skipping fuzzy-search indexes (substring fallback remains active).',
        );
        return;
      }

      // 2. IMMUTABLE wrapper so unaccent() can be used inside an index expression.
      //    unaccent() itself is only STABLE; wrapping it (schema-qualified, with a
      //    pinned search_path) lets us mark it IMMUTABLE so a functional index is
      //    allowed AND resolves correctly when inlined during index creation.
      await this.dataSource.query(`
        CREATE OR REPLACE FUNCTION f_unaccent(text)
        RETURNS text
        LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
        SET search_path = ${unaccentSchema}, pg_catalog
        AS $$ SELECT ${unaccentSchema}.unaccent($1) $$;
      `);

      // 3. GIN trigram indexes on the normalized (lower + unaccent) text.
      //    The opclass is schema-qualified for the same reason as above.
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_heritage_title_trgm
        ON heritage_items
        USING gin (f_unaccent(lower(title)) ${trgmSchema}.gin_trgm_ops)
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_heritage_alt_names_trgm
        ON heritage_items
        USING gin (f_unaccent(lower(coalesce(alternative_names::text, ''))) ${trgmSchema}.gin_trgm_ops)
      `);

      this.logger.log('Heritage fuzzy-search indexes ready (unaccent + pg_trgm)');
    } catch (err) {
      // Non-fatal: search still works via the substring fallback in the repository.
      this.logger.warn(
        `Failed to initialize fuzzy-search indexes: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Runs a "SELECT ... AS schema LIMIT 1" probe and returns the schema name,
   * or undefined when nothing matched. Guards against an injectable schema name
   * by allowing only valid identifier characters.
   */
  private async resolveSchema(sql: string): Promise<string | undefined> {
    const rows = await this.dataSource.query(sql);
    const schema = rows?.[0]?.schema as string | undefined;
    if (schema && /^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) return schema;
    return undefined;
  }
}
