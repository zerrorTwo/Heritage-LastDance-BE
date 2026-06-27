import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserModel } from '../user/model';

@Entity('user_mcp_tokens')
export class McpTokenModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserModel, { onDelete: 'CASCADE' })
  user!: UserModel;

  /** The actual token value, format: usr_<random> */
  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  /** Human-readable label, e.g. "Claude Web", "ChatGPT" */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt!: Date | null;
}
