import { Injectable, Logger } from '@nestjs/common';
import { GraphRepository } from './repository';
import {
  buildFullGraph,
  buildMapLocations,
  buildNeighbors,
  buildOverviewStats,
  buildTimeline,
} from './dataset.helpers';

/**
 * GraphService — phục vụ "Vietnam Historical Universe".
 *
 * Nguồn chân lý là Postgres (graph_nodes/graph_edges). Đọc trực tiếp từ PG để
 * thay đổi của admin hiện ra ngay. Nếu PG lỗi/rỗng thì fallback dataset trong
 * bộ nhớ để FE không bao giờ "trắng". Neo4j là bản dẫn xuất (sync khi CRUD),
 * không nằm trên đường đọc.
 */
@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);
  private usedFallback = false;

  constructor(private readonly repo: GraphRepository) {}

  /** Điểm trên bản đồ + neighbors, có lọc theo khoảng năm (slider thời gian — A1). */
  async getMapLocations(from?: number, to?: number) {
    try {
      const items = await this.repo.buildMapLocations(from, to);
      if (items.length) {
        this.usedFallback = false;
        return items;
      }
    } catch (err) {
      this.logger.warn(`getMapLocations PG lỗi, fallback dataset: ${(err as Error).message}`);
    }
    this.usedFallback = true;
    return buildMapLocations(from, to);
  }

  /** Ego-graph 1 hop của một node. */
  async getNeighbors(id: string) {
    try {
      const node = await this.repo.getNode(id);
      if (node) {
        return {
          id: node.id,
          name: node.name,
          type: node.type,
          summary: node.summary ?? undefined,
          neighbors: await this.repo.buildNeighbors(id),
        };
      }
    } catch (err) {
      this.logger.warn(`getNeighbors PG lỗi, fallback dataset: ${(err as Error).message}`);
    }
    return { id, neighbors: buildNeighbors(id) };
  }

  /** Toàn bộ đồ thị {nodes, links} cho explorer A4. */
  async getFullGraph() {
    try {
      const graph = await this.repo.buildFullGraph();
      if (graph.nodes.length) {
        this.usedFallback = false;
        return graph;
      }
    } catch (err) {
      this.logger.warn(`getFullGraph PG lỗi, fallback dataset: ${(err as Error).message}`);
    }
    this.usedFallback = true;
    return buildFullGraph();
  }

  async getOverviewStats() {
    try {
      const stats = await this.repo.buildOverviewStats();
      if (stats.some((s) => s.value > 0)) return stats;
    } catch (err) {
      this.logger.warn(`getOverviewStats PG lỗi, fallback dataset: ${(err as Error).message}`);
    }
    return buildOverviewStats();
  }

  async getTimeline() {
    try {
      const tl = await this.repo.buildTimeline();
      if (tl.length) return tl;
    } catch (err) {
      this.logger.warn(`getTimeline PG lỗi, fallback dataset: ${(err as Error).message}`);
    }
    return buildTimeline();
  }

  source(): 'postgres' | 'dataset' {
    return this.usedFallback ? 'dataset' : 'postgres';
  }
}
