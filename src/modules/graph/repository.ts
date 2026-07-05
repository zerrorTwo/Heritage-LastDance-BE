import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GraphNode } from './graph-node.model';
import { GraphEdge } from './graph-edge.model';
import { MapLocation, Neighbor } from './dataset.helpers';

/**
 * Truy cập graph trong Postgres (nguồn chân lý). Cung cấp:
 *  - read: build các "view" (map-locations/full/timeline/neighbors/overview) GIỮ NGUYÊN
 *    shape mà FE đang dùng (port từ dataset.helpers nhưng đọc từ DB).
 *  - write: upsert/delete node & edge (dùng cho import seed + CRUD admin).
 */
@Injectable()
export class GraphRepository {
  constructor(
    @InjectRepository(GraphNode) private readonly nodeRepo: Repository<GraphNode>,
    @InjectRepository(GraphEdge) private readonly edgeRepo: Repository<GraphEdge>,
  ) {}

  // ── helpers ──
  private num(v: unknown): number | undefined {
    if (v == null) return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }

  private overlapsYear(n: GraphNode, from?: number, to?: number): boolean {
    if (from == null && to == null) return true;
    const ns = n.yearStart ?? n.yearEnd;
    if (ns == null) return true;
    const ne = n.yearEnd ?? n.yearStart ?? ns;
    return ne >= (from ?? -Infinity) && ns <= (to ?? Infinity);
  }

  private neighborsOf(id: string, nodes: Map<string, GraphNode>, edges: GraphEdge[]): Neighbor[] {
    const out: Neighbor[] = [];
    for (const e of edges) {
      if (e.fromId === id) {
        const m = nodes.get(e.toId);
        if (m) out.push({ relation: e.relation, direction: 'out', node: { id: m.id, name: m.name, nameEn: m.nameEn ?? undefined, type: m.type } });
      } else if (e.toId === id) {
        const m = nodes.get(e.fromId);
        if (m) out.push({ relation: e.relation, direction: 'in', node: { id: m.id, name: m.name, nameEn: m.nameEn ?? undefined, type: m.type } });
      }
    }
    return out;
  }

  // ── reads ──
  async count(): Promise<number> {
    return this.nodeRepo.count();
  }

  async allNodes(): Promise<GraphNode[]> {
    return this.nodeRepo.find();
  }

  async allEdges(): Promise<GraphEdge[]> {
    return this.edgeRepo.find();
  }

  /** Node có toạ độ (để match hành trình + bản đồ). */
  async geoNodes(): Promise<Array<{ id: string; name: string; lat: number; lng: number; type: string; heritageSlug: string | null }>> {
    const rows = await this.nodeRepo.createQueryBuilder('n')
      .where('n.lat IS NOT NULL AND n.lng IS NOT NULL')
      .getMany();
    return rows.map((n) => ({
      id: n.id,
      name: n.name,
      lat: Number(n.lat),
      lng: Number(n.lng),
      type: n.type,
      heritageSlug: n.heritageSlug ?? null,
    }));
  }

  async buildMapLocations(from?: number, to?: number): Promise<MapLocation[]> {
    const [nodes, edges] = await Promise.all([this.allNodes(), this.allEdges()]);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return nodes
      .filter((n) => n.mapPoint && n.lat != null && n.lng != null)
      .filter((n) => this.overlapsYear(n, from, to))
      .map((n) => ({
        id: n.id,
        name: n.name,
        nameEn: n.nameEn ?? undefined,
        year: n.year ?? undefined,
        yearStart: n.yearStart ?? undefined,
        yearEnd: n.yearEnd ?? undefined,
        type: n.type,
        lng: Number(n.lng),
        lat: Number(n.lat),
        province: n.province ?? undefined,
        heritageSlug: n.heritageSlug ?? undefined,
        summary: n.summary ?? '',
        summaryEn: n.summaryEn ?? undefined,
        neighbors: this.neighborsOf(n.id, byId, edges),
      }));
  }

  async buildNeighbors(id: string): Promise<Neighbor[]> {
    const [nodes, edges] = await Promise.all([this.allNodes(), this.allEdges()]);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return this.neighborsOf(id, byId, edges);
  }

  async getNode(id: string): Promise<GraphNode | null> {
    return this.nodeRepo.findOne({ where: { id } });
  }

  async buildFullGraph() {
    const [nodes, edges] = await Promise.all([this.allNodes(), this.allEdges()]);
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        name: n.name,
        nameEn: n.nameEn ?? undefined,
        type: n.type,
        year: n.year ?? undefined,
        province: n.province ?? undefined,
        heritageSlug: n.heritageSlug ?? undefined,
        summary: n.summary ?? '',
        summaryEn: n.summaryEn ?? undefined,
        mapPoint: !!n.mapPoint,
      })),
      links: edges.map((e) => ({ source: e.fromId, target: e.toId, relation: e.relation })),
    };
  }

  async buildTimeline() {
    const nodes = await this.allNodes();
    return nodes
      .filter((n) => (n.type === 'battle' || n.type === 'event') && n.yearStart != null)
      .sort((a, b) => (a.yearStart as number) - (b.yearStart as number))
      .map((n) => ({
        id: n.id,
        name: n.name,
        nameEn: n.nameEn ?? undefined,
        type: n.type,
        year: n.year ?? undefined,
        yearStart: n.yearStart ?? undefined,
        yearEnd: n.yearEnd ?? undefined,
        lat: this.num(n.lat),
        lng: this.num(n.lng),
        mapPoint: !!n.mapPoint,
        summary: n.summary ?? '',
        summaryEn: n.summaryEn ?? undefined,
      }));
  }

  async buildOverviewStats() {
    const [nodes, edges] = await Promise.all([this.allNodes(), this.allEdges()]);
    const count = (types: string[]) => nodes.filter((n) => types.includes(n.type)).length;
    return [
      { key: 'battle', value: count(['battle']), label: 'Trận chiến' },
      { key: 'person', value: count(['person']), label: 'Nhân vật' },
      { key: 'event', value: count(['event']), label: 'Sự kiện' },
      { key: 'heritage', value: count(['heritage', 'capital']), label: 'Di sản & Kinh đô' },
      { key: 'relation', value: edges.length, label: 'Quan hệ' },
    ];
  }

  // ── writes (import seed + CRUD admin) ──
  async upsertNode(data: Partial<GraphNode>): Promise<GraphNode> {
    return this.nodeRepo.save(this.nodeRepo.create(data));
  }

  async deleteNode(id: string): Promise<void> {
    // Gỡ mọi cạnh liên quan trước (không có FK ràng buộc nên xoá thủ công).
    await this.edgeRepo
      .createQueryBuilder()
      .delete()
      .where('from_id = :id OR to_id = :id', { id })
      .execute();
    await this.nodeRepo.delete(id);
  }

  async findEdge(fromId: string, toId: string, relation: string): Promise<GraphEdge | null> {
    return this.edgeRepo.findOne({ where: { fromId, toId, relation } });
  }

  async upsertEdge(fromId: string, toId: string, relation: string): Promise<GraphEdge> {
    const existing = await this.findEdge(fromId, toId, relation);
    if (existing) return existing;
    return this.edgeRepo.save(this.edgeRepo.create({ fromId, toId, relation }));
  }

  async deleteEdge(id: string): Promise<void> {
    await this.edgeRepo.delete(id);
  }

  async nodesExist(ids: string[]): Promise<Set<string>> {
    if (!ids.length) return new Set();
    const rows = await this.nodeRepo.find({ where: { id: In(ids) }, select: ['id'] });
    return new Set(rows.map((r) => r.id));
  }
}
