import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';
import {
  buildFullGraph,
  buildMapLocations,
  buildNeighbors,
  buildOverviewStats,
  buildTimeline,
  HERITAGE_SLUG_BY_NODE_ID,
  Neighbor,
} from './dataset.helpers';

/**
 * GraphService — phục vụ "Vietnam Historical Universe".
 * Ưu tiên truy vấn Neo4j; nếu Neo4j chưa sẵn sàng hoặc query lỗi thì fallback
 * sang dataset trong bộ nhớ để FE không bao giờ "trắng".
 */
@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);

  constructor(private readonly neo4j: Neo4jService) {}

  private get useNeo4j(): boolean {
    return this.neo4j.isConnected();
  }

  /** Điểm trên bản đồ + neighbors, có lọc theo khoảng năm (slider thời gian — A1). */
  async getMapLocations(from?: number, to?: number) {
    if (this.useNeo4j) {
      try {
        const cypher = `
          MATCH (n) WHERE n.mapPoint = true
            AND ($from IS NULL OR coalesce(n.yearEnd, n.yearStart) >= $from)
            AND ($to IS NULL OR coalesce(n.yearStart, n.yearEnd) <= $to)
          OPTIONAL MATCH (n)-[r]-(m)
          RETURN n AS n,
            collect(CASE WHEN m IS NULL THEN NULL ELSE {
              relation: type(r),
              direction: CASE WHEN startNode(r) = n THEN 'out' ELSE 'in' END,
              node: { id: m.id, name: m.name, type: m.type }
            } END) AS neighbors`;
        const rows = await this.neo4j.run(cypher, { from: from ?? null, to: to ?? null });
        return rows.map((row: any) => {
          const p = row.n.properties;
          return {
            id: p.id,
            name: p.name,
            nameEn: p.nameEn,
            year: p.year,
            yearStart: this.toNum(p.yearStart),
            yearEnd: this.toNum(p.yearEnd),
            type: p.type,
            lng: this.toNum(p.lng),
            lat: this.toNum(p.lat),
            province: p.province,
            heritageSlug: HERITAGE_SLUG_BY_NODE_ID.get(p.id),
            summary: p.summary,
            neighbors: (row.neighbors || []).filter(Boolean) as Neighbor[],
          };
        });
      } catch (err) {
        this.logger.warn(`getMapLocations Neo4j lỗi, fallback dataset: ${(err as Error).message}`);
      }
    }
    return buildMapLocations(from, to);
  }

  /** Ego-graph 1 hop của một node. */
  async getNeighbors(id: string) {
    if (this.useNeo4j) {
      try {
        const cypher = `
          MATCH (n { id: $id })
          OPTIONAL MATCH (n)-[r]-(m)
          RETURN n AS n,
            collect(CASE WHEN m IS NULL THEN NULL ELSE {
              relation: type(r),
              direction: CASE WHEN startNode(r) = n THEN 'out' ELSE 'in' END,
              node: { id: m.id, name: m.name, type: m.type }
            } END) AS neighbors`;
        const rows = await this.neo4j.run(cypher, { id });
        if (rows.length) {
          const row: any = rows[0];
          const p = row.n.properties;
          return {
            id: p.id,
            name: p.name,
            type: p.type,
            summary: p.summary,
            neighbors: (row.neighbors || []).filter(Boolean) as Neighbor[],
          };
        }
      } catch (err) {
        this.logger.warn(`getNeighbors Neo4j lỗi, fallback dataset: ${(err as Error).message}`);
      }
    }
    return { id, neighbors: buildNeighbors(id) };
  }

  /** Toàn bộ đồ thị {nodes, links} cho explorer A4. */
  async getFullGraph() {
    if (this.useNeo4j) {
      try {
        const nodesRows = await this.neo4j.run(`MATCH (n) RETURN n`);
        const linkRows = await this.neo4j.run(
          `MATCH (a)-[r]->(b) RETURN a.id AS source, b.id AS target, type(r) AS relation`,
        );
        if (nodesRows.length) {
          return {
            nodes: nodesRows.map((row: any) => {
              const p = row.n.properties;
              return {
                id: p.id,
                name: p.name,
                nameEn: p.nameEn,
                type: p.type,
                year: p.year,
                province: p.province,
                heritageSlug: HERITAGE_SLUG_BY_NODE_ID.get(p.id),
                summary: p.summary,
                mapPoint: !!p.mapPoint,
              };
            }),
            links: linkRows.map((r: any) => ({
              source: r.source,
              target: r.target,
              relation: r.relation,
            })),
          };
        }
      } catch (err) {
        this.logger.warn(`getFullGraph Neo4j lỗi, fallback dataset: ${(err as Error).message}`);
      }
    }
    return buildFullGraph();
  }

  async getOverviewStats() {
    // Thống kê nhẹ — luôn tính từ dataset (đồng bộ với nội dung đã seed).
    return buildOverviewStats();
  }

  async getTimeline() {
    return buildTimeline();
  }

  source(): 'neo4j' | 'dataset' {
    return this.useNeo4j ? 'neo4j' : 'dataset';
  }

  private toNum(v: any): number | undefined {
    if (v == null) return undefined;
    if (typeof v === 'number') return v;
    // neo4j Integer
    if (typeof v === 'object' && typeof v.toNumber === 'function') return v.toNumber();
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
}
