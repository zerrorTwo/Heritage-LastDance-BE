import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Cạnh (quan hệ có hướng) giữa hai node graph. Nguồn chân lý ở Postgres,
 * sync sang Neo4j thành `(:Entity {id:fromId})-[:RELATION]->(:Entity {id:toId})`.
 */
@Entity('graph_edges')
@Unique('uq_graph_edge', ['fromId', 'toId', 'relation'])
@Index('idx_graph_edges_from', ['fromId'])
@Index('idx_graph_edges_to', ['toId'])
export class GraphEdge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  fromId!: string;

  @Column({ type: 'varchar', length: 64 })
  toId!: string;

  /** Tên quan hệ (PRECEDED, RELATED_TO, COMMANDED, ...). */
  @Column({ type: 'varchar', length: 60 })
  relation!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
