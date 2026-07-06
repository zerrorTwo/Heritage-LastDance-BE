/**
 * Seed dataset "Nhà Trần chống Nguyên–Mông" vào Neo4j.
 *
 * Chạy:  npm run seed:graph
 * Cấu hình lấy từ configs/dev.yaml (qua loadEnv) hoặc biến môi trường:
 *   NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
 *
 * Idempotent: dùng MERGE theo id nên chạy lại nhiều lần không nhân đôi dữ liệu.
 */
import 'dotenv/config';
import loadEnv from '../../../config/configuration';
loadEnv();

import neo4j from 'neo4j-driver';
import { NODES, EDGES } from './tran-dynasty.dataset';

async function main() {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'heritage_neo4j';

  console.log(`[seed:graph] Kết nối Neo4j ${uri} ...`);
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  await driver.verifyConnectivity();
  const session = driver.session();

  try {
    // Xoá sạch để seed lại (chỉ dùng cho môi trường dev).
    console.log('[seed:graph] Xoá dữ liệu cũ ...');
    await session.run('MATCH (n) DETACH DELETE n');

    // Tạo constraint id duy nhất (an toàn nếu đã tồn tại).
    await session.run(
      'CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE',
    );

    // Tạo node — gắn cả label cụ thể (Person/Event/...) lẫn label chung :Entity.
    console.log(`[seed:graph] Tạo ${NODES.length} node ...`);
    for (const n of NODES) {
      const cypher = `
        MERGE (x:Entity { id: $id })
        SET x += $props
        WITH x CALL apoc.create.addLabels(x, [$label]) YIELD node RETURN node`;
      try {
        await session.run(cypher, { id: n.id, props: stripUndefined(n), label: n.label });
      } catch {
        // Không có APOC -> tạo node với label cố định bằng cách build query động.
        await session.run(
          `MERGE (x:Entity:${safeLabel(n.label)} { id: $id }) SET x += $props`,
          { id: n.id, props: stripUndefined(n) },
        );
      }
    }

    // Tạo quan hệ.
    console.log(`[seed:graph] Tạo ${EDGES.length} quan hệ ...`);
    for (const e of EDGES) {
      await session.run(
        `MATCH (a:Entity { id: $from }), (b:Entity { id: $to })
         MERGE (a)-[r:${safeRel(e.relation)}]->(b)`,
        { from: e.from, to: e.to },
      );
    }

    const count = await session.run(
      'MATCH (n) RETURN count(n) AS nodes',
    );
    const rels = await session.run('MATCH ()-[r]->() RETURN count(r) AS rels');
    console.log(
      `[seed:graph] HOÀN TẤT: ${count.records[0].get('nodes')} node, ${rels.records[0].get('rels')} quan hệ.`,
    );
  } finally {
    await session.close();
    await driver.close();
  }
}

function stripUndefined<T extends Record<string, any>>(obj: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && k !== 'label') out[k] = v;
  }
  return out;
}

/** Chỉ cho phép ký tự an toàn cho label/relation type (chống injection). */
function safeLabel(s: string): string {
  return s.replace(/[^A-Za-z0-9_]/g, '');
}
function safeRel(s: string): string {
  return s.replace(/[^A-Za-z0-9_]/g, '');
}

main().catch((err) => {
  console.error('[seed:graph] LỖI:', err);
  process.exit(1);
});
