import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Node của "Vietnam Historical Universe" — nguồn chân lý nằm ở Postgres (Neon).
 * Neo4j chỉ là bản dẫn xuất được sync lại mỗi khi node thay đổi.
 *
 * `id` là khóa nghiệp vụ do người tạo đặt (vd `bach_dang_1288`), không tự sinh,
 * để giữ tương thích với dataset gốc + quan hệ trong graph_edges.
 */
@Entity('graph_nodes')
@Index('idx_graph_nodes_type', ['type'])
@Index('idx_graph_nodes_map_point', ['mapPoint'])
export class GraphNode {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  /** Neo4j label (Person/Event/Battle/Place/Heritage/...). */
  @Column({ type: 'varchar', length: 40 })
  label!: string;

  /** Loại node: dynasty|person|enemy|event|battle|capital|heritage|artifact. */
  @Column({ type: 'varchar', length: 20 })
  type!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nameEn!: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  year!: string | null;

  @Column({ type: 'int', nullable: true })
  yearStart!: number | null;

  @Column({ type: 'int', nullable: true })
  yearEnd!: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lat!: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lng!: number | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  province!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  era!: string | null;

  @Column({ type: 'boolean', default: false })
  mapPoint!: boolean;

  /** Slug trang di tích thật (heritage_items) — node mở được /heritage/:slug. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  heritageSlug!: string | null;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
