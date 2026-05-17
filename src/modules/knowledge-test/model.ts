import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum KnowledgeTestStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('knowledge_tests')
@Index('idx_knowledge_tests_heritage_id', ['heritageId'])
@Index('idx_knowledge_tests_status', ['status'])
export class KnowledgeTestModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  heritageId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'int', default: 0 })
  totalAttempts!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  averageScore!: number;

  @Column({ type: 'int', default: 0 })
  highestScore!: number;

  @Column({ type: 'int', default: 10 })
  topPerformersLimit!: number;

  @Column({
    type: 'enum',
    enum: KnowledgeTestStatus,
    default: KnowledgeTestStatus.ACTIVE,
  })
  status!: KnowledgeTestStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

@Entity('knowledge_test_questions')
@Index('idx_kt_questions_test_id', ['testId'])
export class KnowledgeTestQuestionModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  testId!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text', nullable: true })
  explanation!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image!: string | null;

  /** Vị trí câu hỏi trong test (để giữ thứ tự hiển thị) */
  @Column({ type: 'int', default: 0 })
  position!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

@Entity('knowledge_test_options')
@Index('idx_kt_options_question_id', ['questionId'])
export class KnowledgeTestOptionModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  questionId!: string;

  @Column({ type: 'text' })
  optionText!: string;

  @Column({ type: 'boolean', default: false })
  isCorrect!: boolean;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

@Entity('knowledge_test_attempts')
@Index('idx_kt_attempts_test_user', ['testId', 'userId'])
@Index('idx_kt_attempts_score', ['testId', 'score'])
export class KnowledgeTestAttemptModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  testId!: string;

  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  userName!: string | null;

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  score!: number;

  @Column({ type: 'int', default: 0 })
  totalQuestions!: number;

  @Column({ type: 'int', default: 0 })
  correctAnswers!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
