/**
 * Helper dẫn xuất các "view" từ dataset canonical (NODES + EDGES).
 * Dùng làm:
 *   - Nguồn fallback khi Neo4j chưa sẵn sàng (đảm bảo FE luôn có data).
 *   - Cơ sở để seed Neo4j.
 *
 * Shape trả về được giữ ĐỒNG BỘ với kỳ vọng của FE (mockData cũ):
 *   neighbor = { relation, direction: 'in'|'out', node: { id, name, type } }
 */
import { NODES, EDGES, GraphNode } from './seed/tran-dynasty.dataset';

const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));

/** node.id -> slug trang di tích thật (curated). Dùng để gắn link ở cả luồng Neo4j lẫn dataset. */
export const HERITAGE_SLUG_BY_NODE_ID = new Map<string, string>(
  NODES.filter((n) => n.heritageSlug).map((n) => [n.id, n.heritageSlug as string]),
);

export interface Neighbor {
  relation: string;
  direction: 'in' | 'out';
  node: { id: string; name: string; type: string };
}

export interface MapLocation {
  id: string;
  name: string;
  nameEn?: string;
  year?: string;
  yearStart?: number;
  yearEnd?: number;
  type: string;
  lng: number;
  lat: number;
  province?: string;
  heritageSlug?: string;
  summary: string;
  neighbors: Neighbor[];
}

/** Toạ độ "chính thức" của một di tích/địa điểm (để verify GPS check-in). */
export function getNodeCoords(id: string): { lat: number; lng: number; name: string } | null {
  const n = NODE_BY_ID.get(id);
  if (n && n.lat != null && n.lng != null) return { lat: n.lat, lng: n.lng, name: n.name };
  return null;
}

/** Tất cả node có toạ độ (để match hành trình với địa danh lịch sử). */
export function getAllGeoNodes(): Array<{
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  heritageSlug?: string;
}> {
  return NODES.filter((n) => n.lat != null && n.lng != null).map((n) => ({
    id: n.id,
    name: n.name,
    lat: n.lat as number,
    lng: n.lng as number,
    type: n.type,
    heritageSlug: n.heritageSlug,
  }));
}

/** Lấy danh sách neighbor (ego-graph 1 hop) của một node. */
export function buildNeighbors(id: string): Neighbor[] {
  const out: Neighbor[] = [];
  for (const e of EDGES) {
    if (e.from === id) {
      const m = NODE_BY_ID.get(e.to);
      if (m) out.push({ relation: e.relation, direction: 'out', node: { id: m.id, name: m.name, type: m.type } });
    } else if (e.to === id) {
      const m = NODE_BY_ID.get(e.from);
      if (m) out.push({ relation: e.relation, direction: 'in', node: { id: m.id, name: m.name, type: m.type } });
    }
  }
  return out;
}

/** Một node "phủ" khoảng năm [yearStart, yearEnd] nếu khoảng tồn tại của nó giao với cửa sổ. */
function overlapsYear(n: GraphNode, from?: number, to?: number): boolean {
  if (from == null && to == null) return true;
  const ns = n.yearStart ?? n.yearEnd;
  if (ns == null) return true; // không rõ năm -> luôn hiện
  const ne = n.yearEnd ?? n.yearStart ?? ns;
  const lo = from ?? -Infinity;
  const hi = to ?? Infinity;
  return ne >= lo && ns <= hi;
}

/** Các điểm đặt trên bản đồ (battle/place/heritage/capital), kèm neighbors. */
export function buildMapLocations(from?: number, to?: number): MapLocation[] {
  return NODES.filter((n) => n.mapPoint && n.lat != null && n.lng != null)
    .filter((n) => overlapsYear(n, from, to))
    .map((n) => ({
      id: n.id,
      name: n.name,
      nameEn: n.nameEn,
      year: n.year,
      yearStart: n.yearStart,
      yearEnd: n.yearEnd,
      type: n.type,
      lng: n.lng as number,
      lat: n.lat as number,
      province: n.province,
      heritageSlug: n.heritageSlug,
      summary: n.summary,
      neighbors: buildNeighbors(n.id),
    }));
}

/** Thống kê tổng quan theo loại node. */
export function buildOverviewStats() {
  const count = (types: string[]) => NODES.filter((n) => types.includes(n.type)).length;
  return [
    { key: 'battle', value: count(['battle']), label: 'Trận chiến' },
    { key: 'person', value: count(['person']), label: 'Nhân vật' },
    { key: 'event', value: count(['event']), label: 'Sự kiện' },
    { key: 'heritage', value: count(['heritage', 'capital']), label: 'Di sản & Kinh đô' },
    { key: 'relation', value: EDGES.length, label: 'Quan hệ' },
  ];
}

/** Dòng thời gian: các sự kiện/trận đánh sắp theo năm (cho A1 timeline). */
export function buildTimeline() {
  return NODES.filter((n) => (n.type === 'battle' || n.type === 'event') && n.yearStart != null)
    .sort((a, b) => (a.yearStart as number) - (b.yearStart as number))
    .map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      year: n.year,
      yearStart: n.yearStart,
      yearEnd: n.yearEnd,
      lat: n.lat,
      lng: n.lng,
      mapPoint: !!n.mapPoint,
      summary: n.summary,
    }));
}

/** Toàn bộ đồ thị {nodes, links} cho explorer A4 (force-graph). */
export function buildFullGraph() {
  return {
    nodes: NODES.map((n) => ({
      id: n.id,
      name: n.name,
      nameEn: n.nameEn,
      type: n.type,
      year: n.year,
      province: n.province,
      heritageSlug: n.heritageSlug,
      summary: n.summary,
      mapPoint: !!n.mapPoint,
    })),
    links: EDGES.map((e) => ({ source: e.from, target: e.to, relation: e.relation })),
  };
}
