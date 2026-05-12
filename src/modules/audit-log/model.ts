import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  SIGNUP = 'SIGNUP',
  RESET_PASSWORD = 'RESET_PASSWORD',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
}

@Entity('audit_logs')
export class AuditLogModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'varchar', nullable: true })
  resourceType!: string | null;

  @Column({ type: 'uuid', nullable: true })
  resourceId!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}

export interface CreateAuditLogData {
  userId?: string | null;
  action: AuditAction;
  ipAddress?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
}

export interface IAuditLogRepository {
  create(data: CreateAuditLogData): Promise<AuditLogModel>;
}