import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { GraphRepository } from './repository';
import { NODES, EDGES } from './seed/tran-dynasty.dataset';

/**
 * Nạp dataset canonical (tran-dynasty) vào Postgres MỘT LẦN, khi bảng graph_nodes
 * còn rỗng. Chạy sau khi TypeORM synchronize đã tạo bảng. Idempotent: đã có data
 * thì bỏ qua, nên chỉnh sửa của admin không bao giờ bị ghi đè.
 *
 * Đây thay cho `npm run seed:graph` (vốn DETACH DELETE Neo4j). Nguồn chân lý giờ
 * là Postgres; Neo4j được sync riêng khi CRUD.
 */
@Injectable()
export class GraphSeedBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(GraphSeedBootstrap.name);

  constructor(private readonly repo: GraphRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const existing = await this.repo.count();
      if (existing > 0) {
        this.logger.log(`Graph PG đã có ${existing} node — bỏ qua import seed.`);
        return;
      }

      this.logger.log(`Graph PG rỗng — import ${NODES.length} node + ${EDGES.length} cạnh từ dataset...`);
      for (const n of NODES) {
        await this.repo.upsertNode({
          id: n.id,
          label: n.label,
          type: n.type,
          name: n.name,
          nameEn: n.nameEn ?? null,
          year: n.year ?? null,
          yearStart: n.yearStart ?? null,
          yearEnd: n.yearEnd ?? null,
          lat: n.lat ?? null,
          lng: n.lng ?? null,
          province: n.province ?? null,
          era: n.era ?? null,
          mapPoint: !!n.mapPoint,
          heritageSlug: n.heritageSlug ?? null,
          summary: n.summary ?? null,
        });
      }
      for (const e of EDGES) {
        await this.repo.upsertEdge(e.from, e.to, e.relation);
      }
      this.logger.log('Graph PG import seed HOÀN TẤT.');
    } catch (err) {
      this.logger.warn(`Graph seed bootstrap lỗi (bỏ qua, dùng fallback dataset): ${(err as Error).message}`);
    }
  }
}
