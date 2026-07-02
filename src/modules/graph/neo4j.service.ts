import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import neo4j, { Driver } from 'neo4j-driver';

/**
 * Bọc driver Neo4j. Kết nối "mềm" (soft): nếu Neo4j chưa cấu hình hoặc không
 * kết nối được thì service vẫn khởi động bình thường (GraphService sẽ fallback
 * sang dataset trong bộ nhớ). Nhờ vậy backend không phụ thuộc cứng vào Neo4j.
 *
 * Cấu hình (configs/dev.yaml hoặc env):
 *   NEO4J_URI=bolt://localhost:7687
 *   NEO4J_USER=neo4j
 *   NEO4J_PASSWORD=heritage_neo4j
 *   NEO4J_ENABLED=true
 */
@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Neo4jService.name);
  private driver: Driver | null = null;
  private connected = false;

  async onModuleInit() {
    const enabled = (process.env.NEO4J_ENABLED ?? 'true') !== 'false';
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'heritage_neo4j';

    if (!enabled) {
      this.logger.warn('Neo4j bị tắt (NEO4J_ENABLED=false) — dùng dataset fallback.');
      return;
    }

    try {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
        connectionTimeout: 4000,
        maxConnectionPoolSize: 20,
      });
      await this.driver.verifyConnectivity();
      this.connected = true;
      this.logger.log(`Đã kết nối Neo4j tại ${uri}`);
    } catch (err) {
      this.connected = false;
      this.driver = null;
      this.logger.warn(
        `Không kết nối được Neo4j (${uri}): ${(err as Error).message}. Dùng dataset fallback.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.driver) await this.driver.close();
  }

  isConnected(): boolean {
    return this.connected && this.driver != null;
  }

  /** Chạy một câu Cypher, trả về mảng record đã map sang object thường. */
  async run<T = any>(cypher: string, params: Record<string, any> = {}): Promise<T[]> {
    if (!this.driver) throw new Error('Neo4j driver chưa sẵn sàng');
    const session = this.driver.session();
    try {
      const res = await session.run(cypher, params);
      return res.records.map((r) => r.toObject() as T);
    } finally {
      await session.close();
    }
  }

  getDriver(): Driver | null {
    return this.driver;
  }
}
