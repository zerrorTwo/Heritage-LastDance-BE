import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GraphRepository } from './repository';
import { Neo4jService } from './neo4j.service';
import { GraphNode } from './graph-node.model';
import { CreateGraphEdgeDto, CreateGraphNodeDto, UpdateGraphNodeDto } from './dto/graph-admin.dto';

/**
 * CRUD graph cho admin. Ghi vào Postgres (nguồn chân lý) rồi SYNC sang Neo4j
 * (bản dẫn xuất) — fail-soft: Neo4j sập không chặn CRUD.
 */
@Injectable()
export class GraphAdminService {
  private readonly logger = new Logger(GraphAdminService.name);

  constructor(
    private readonly repo: GraphRepository,
    private readonly neo4j: Neo4jService,
  ) {}

  // Label Neo4j viết hoa đầu (Person, Battle...) từ type; relation chuẩn hóa A-Z_.
  private labelFromType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
  private safeRel(rel: string): string {
    const s = rel.toUpperCase().replace(/[^A-Z0-9_]/g, '_').replace(/^_+|_+$/g, '');
    return s || 'RELATED_TO';
  }

  // ── NODE ──
  async listNodes() {
    return this.repo.allNodes();
  }

  async createNode(dto: CreateGraphNodeDto): Promise<GraphNode> {
    const existing = await this.repo.getNode(dto.id);
    if (existing) throw new BadRequestException(`Node id "${dto.id}" đã tồn tại`);
    const node = await this.repo.upsertNode({
      ...dto,
      label: dto.label || this.labelFromType(dto.type),
      mapPoint: dto.mapPoint ?? false,
    });
    await this.syncNode(node);
    return node;
  }

  async updateNode(id: string, dto: UpdateGraphNodeDto): Promise<GraphNode> {
    const existing = await this.repo.getNode(id);
    if (!existing) throw new NotFoundException(`Không tìm thấy node "${id}"`);
    const node = await this.repo.upsertNode({ ...existing, ...dto, id });
    await this.syncNode(node);
    return node;
  }

  async deleteNode(id: string): Promise<{ deleted: boolean }> {
    const existing = await this.repo.getNode(id);
    if (!existing) throw new NotFoundException(`Không tìm thấy node "${id}"`);
    await this.repo.deleteNode(id);
    await this.removeNodeFromNeo4j(id);
    return { deleted: true };
  }

  // ── EDGE ──
  async listEdges() {
    return this.repo.allEdges();
  }

  async createEdge(dto: CreateGraphEdgeDto) {
    if (dto.fromId === dto.toId) throw new BadRequestException('Cạnh không thể nối node với chính nó');
    const present = await this.repo.nodesExist([dto.fromId, dto.toId]);
    if (!present.has(dto.fromId)) throw new BadRequestException(`Node "${dto.fromId}" không tồn tại`);
    if (!present.has(dto.toId)) throw new BadRequestException(`Node "${dto.toId}" không tồn tại`);
    const edge = await this.repo.upsertEdge(dto.fromId, dto.toId, dto.relation);
    await this.syncEdge(edge.fromId, edge.toId, edge.relation);
    return edge;
  }

  async deleteEdge(id: string): Promise<{ deleted: boolean }> {
    const edges = await this.repo.allEdges();
    const edge = edges.find((e) => e.id === id);
    if (!edge) throw new NotFoundException('Không tìm thấy cạnh');
    await this.repo.deleteEdge(id);
    await this.removeEdgeFromNeo4j(edge.fromId, edge.toId, edge.relation);
    return { deleted: true };
  }

  // ── Sync Neo4j (fail-soft) ──
  private async syncNode(node: GraphNode): Promise<void> {
    if (!this.neo4j.isConnected()) return;
    try {
      const props: Record<string, any> = {
        id: node.id,
        label: node.label,
        type: node.type,
        name: node.name,
        nameEn: node.nameEn ?? null,
        year: node.year ?? null,
        yearStart: node.yearStart ?? null,
        yearEnd: node.yearEnd ?? null,
        lat: node.lat != null ? Number(node.lat) : null,
        lng: node.lng != null ? Number(node.lng) : null,
        province: node.province ?? null,
        era: node.era ?? null,
        mapPoint: !!node.mapPoint,
        heritageSlug: node.heritageSlug ?? null,
        summary: node.summary ?? null,
      };
      await this.neo4j.run('MERGE (x:Entity { id: $id }) SET x += $props', { id: node.id, props });
    } catch (err) {
      this.logger.warn(`Sync node "${node.id}" sang Neo4j lỗi: ${(err as Error).message}`);
    }
  }

  private async removeNodeFromNeo4j(id: string): Promise<void> {
    if (!this.neo4j.isConnected()) return;
    try {
      await this.neo4j.run('MATCH (n:Entity { id: $id }) DETACH DELETE n', { id });
    } catch (err) {
      this.logger.warn(`Xoá node "${id}" khỏi Neo4j lỗi: ${(err as Error).message}`);
    }
  }

  private async syncEdge(fromId: string, toId: string, relation: string): Promise<void> {
    if (!this.neo4j.isConnected()) return;
    try {
      await this.neo4j.run(
        `MATCH (a:Entity { id: $from }), (b:Entity { id: $to })
         MERGE (a)-[r:${this.safeRel(relation)}]->(b)`,
        { from: fromId, to: toId },
      );
    } catch (err) {
      this.logger.warn(`Sync cạnh ${fromId}->${toId} sang Neo4j lỗi: ${(err as Error).message}`);
    }
  }

  private async removeEdgeFromNeo4j(fromId: string, toId: string, relation: string): Promise<void> {
    if (!this.neo4j.isConnected()) return;
    try {
      await this.neo4j.run(
        `MATCH (a:Entity { id: $from })-[r:${this.safeRel(relation)}]->(b:Entity { id: $to }) DELETE r`,
        { from: fromId, to: toId },
      );
    } catch (err) {
      this.logger.warn(`Xoá cạnh ${fromId}->${toId} khỏi Neo4j lỗi: ${(err as Error).message}`);
    }
  }
}
