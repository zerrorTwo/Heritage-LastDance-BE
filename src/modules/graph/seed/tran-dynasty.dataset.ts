/**
 * DATASET CANONICAL — "Vũ trụ lịch sử Việt Nam": Nhà Trần & ba lần kháng chiến chống Nguyên–Mông (TK XIII).
 *
 * Đây là NGUỒN CHÂN LÝ (single source of truth) để:
 *   1. Seed vào Neo4j (graph "Vietnam Historical Universe").
 *   2. Phục vụ bản đồ lịch sử động (A1) — các node có toạ độ + năm.
 *   3. Phục vụ knowledge graph explorer (A4) — toàn bộ node + cạnh.
 *
 * Mô hình:
 *   - GraphNode.label: nhãn Neo4j (Person/Event/Place/Heritage/Dynasty/Enemy/Artifact).
 *   - GraphNode.type:  loại hiển thị (đồng bộ NODE_TYPE_META ở FE) để chọn màu/icon.
 *   - Node "đặt được trên bản đồ" có lat/lng + mapPoint=true (battle/place/heritage/capital).
 *   - Node có yearStart/yearEnd dùng cho slider thời gian; year là nhãn hiển thị.
 *
 * Nguồn nội dung: Đại Việt sử ký toàn thư, các tư liệu phổ thông về kháng chiến chống Nguyên–Mông.
 */

export type NodeType =
  | 'battle'
  | 'person'
  | 'dynasty'
  | 'heritage'
  | 'capital'
  | 'enemy'
  | 'event'
  | 'artifact';

export interface GraphNode {
  id: string;
  label: string; // Neo4j label
  type: NodeType;
  name: string;
  nameEn?: string;
  year?: string;
  yearStart?: number; // năm bắt đầu (cho slider)
  yearEnd?: number; // năm kết thúc
  lat?: number;
  lng?: number;
  province?: string;
  mapPoint?: boolean; // có hiển thị trên bản đồ không
  era?: string; // giai đoạn (vd "Nhà Trần")
  summary: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NODES
// ─────────────────────────────────────────────────────────────────────────────
export const NODES: GraphNode[] = [
  // ── Triều đại / thế lực ──
  {
    id: 'nha_tran',
    label: 'Dynasty',
    type: 'dynasty',
    name: 'Nhà Trần',
    nameEn: 'Trần Dynasty',
    year: '1225–1400',
    yearStart: 1225,
    yearEnd: 1400,
    era: 'Nhà Trần',
    summary:
      'Triều đại lãnh đạo Đại Việt ba lần đánh bại đế quốc Nguyên–Mông hùng mạnh nhất thế giới thế kỷ XIII, mở ra thời kỳ "Hào khí Đông A".',
  },
  {
    id: 'de_quoc_nguyen_mong',
    label: 'Enemy',
    type: 'enemy',
    name: 'Đế quốc Nguyên – Mông',
    nameEn: 'Mongol–Yuan Empire',
    year: 'TK XIII',
    yearStart: 1206,
    yearEnd: 1368,
    summary:
      'Đế quốc lớn nhất lịch sử nhân loại tính theo lãnh thổ liền kề, ba lần đem đại quân xâm lược Đại Việt nhưng đều thất bại.',
  },

  // ── Vua & hoàng tộc nhà Trần ──
  {
    id: 'tran_thai_tong',
    label: 'Person',
    type: 'person',
    name: 'Trần Thái Tông',
    nameEn: 'Trần Thái Tông',
    year: '1218–1277',
    yearStart: 1225,
    yearEnd: 1258,
    summary:
      'Vị vua khai sáng nhà Trần, trực tiếp cầm quân trong cuộc kháng chiến chống Nguyên–Mông lần thứ nhất (1258).',
  },
  {
    id: 'tran_thanh_tong',
    label: 'Person',
    type: 'person',
    name: 'Trần Thánh Tông',
    nameEn: 'Trần Thánh Tông',
    year: '1240–1290',
    yearStart: 1258,
    yearEnd: 1290,
    summary:
      'Làm Thái thượng hoàng, cùng vua Trần Nhân Tông lãnh đạo hai cuộc kháng chiến 1285 và 1288.',
  },
  {
    id: 'tran_nhan_tong',
    label: 'Person',
    type: 'person',
    name: 'Trần Nhân Tông',
    nameEn: 'Trần Nhân Tông',
    year: '1258–1308',
    yearStart: 1278,
    yearEnd: 1293,
    summary:
      'Vị vua anh minh lãnh đạo kháng chiến lần 2 (1285) và lần 3 (1288); sau xuất gia, sáng lập Thiền phái Trúc Lâm Yên Tử.',
  },
  {
    id: 'tran_hung_dao',
    label: 'Person',
    type: 'person',
    name: 'Trần Hưng Đạo',
    nameEn: 'Trần Hưng Đạo (Trần Quốc Tuấn)',
    year: '1228–1300',
    yearStart: 1285,
    yearEnd: 1288,
    summary:
      'Hưng Đạo Đại Vương Trần Quốc Tuấn — Quốc công Tiết chế, tổng chỉ huy quân đội, kiến trúc sư chiến thắng Bạch Đằng 1288. Tác giả "Hịch tướng sĩ".',
  },
  {
    id: 'tran_quang_khai',
    label: 'Person',
    type: 'person',
    name: 'Trần Quang Khải',
    nameEn: 'Trần Quang Khải',
    year: '1241–1294',
    yearStart: 1285,
    yearEnd: 1285,
    summary:
      'Thượng tướng Thái sư, chỉ huy chiến thắng Chương Dương 1285, tác giả câu thơ "Đoạt sáo Chương Dương độ".',
  },
  {
    id: 'tran_nhat_duat',
    label: 'Person',
    type: 'person',
    name: 'Trần Nhật Duật',
    nameEn: 'Trần Nhật Duật',
    year: '1255–1330',
    yearStart: 1285,
    yearEnd: 1285,
    summary:
      'Chiêu Văn Vương, vị tướng đa tài, chỉ huy chiến thắng Hàm Tử 1285, nổi tiếng am hiểu ngôn ngữ và văn hoá các dân tộc.',
  },
  {
    id: 'tran_quoc_toan',
    label: 'Person',
    type: 'person',
    name: 'Trần Quốc Toản',
    nameEn: 'Trần Quốc Toản',
    year: '1267–1285',
    yearStart: 1282,
    yearEnd: 1285,
    summary:
      'Hoài Văn Hầu, thiếu niên anh hùng bóp nát quả cam vì không được dự bàn việc nước, giương cờ "Phá cường địch, báo hoàng ân".',
  },
  {
    id: 'tran_binh_trong',
    label: 'Person',
    type: 'person',
    name: 'Trần Bình Trọng',
    nameEn: 'Trần Bình Trọng',
    year: '1259–1285',
    yearStart: 1285,
    yearEnd: 1285,
    summary:
      'Vị tướng hy sinh ở Thiên Mạc, để lại khí phách "Ta thà làm quỷ nước Nam, chứ không thèm làm vương đất Bắc".',
  },
  {
    id: 'tran_khanh_du',
    label: 'Person',
    type: 'person',
    name: 'Trần Khánh Dư',
    nameEn: 'Trần Khánh Dư',
    year: '1240–1340',
    yearStart: 1287,
    yearEnd: 1288,
    summary:
      'Phó tướng trấn giữ Vân Đồn, tiêu diệt đoàn thuyền lương của Trương Văn Hổ — đòn quyết định khiến quân Nguyên thiếu lương.',
  },
  {
    id: 'tran_thu_do',
    label: 'Person',
    type: 'person',
    name: 'Trần Thủ Độ',
    nameEn: 'Trần Thủ Độ',
    year: '1194–1264',
    yearStart: 1225,
    yearEnd: 1258,
    summary:
      'Thái sư khai quốc nhà Trần, người để lại câu nói bất hủ trong kháng chiến lần 1: "Đầu thần chưa rơi xuống đất, xin bệ hạ đừng lo".',
  },
  {
    id: 'pham_ngu_lao',
    label: 'Person',
    type: 'person',
    name: 'Phạm Ngũ Lão',
    nameEn: 'Phạm Ngũ Lão',
    year: '1255–1320',
    yearStart: 1285,
    yearEnd: 1288,
    summary:
      'Tướng tài xuất thân bình dân, gia tướng và con rể Trần Hưng Đạo, nổi tiếng với giai thoại "ngồi đan sọt giữa đường mải nghĩ việc nước".',
  },
  {
    id: 'yet_kieu',
    label: 'Person',
    type: 'person',
    name: 'Yết Kiêu',
    nameEn: 'Yết Kiêu',
    year: '1242–1303',
    yearStart: 1285,
    yearEnd: 1288,
    summary:
      'Gia tướng của Trần Hưng Đạo, tài bơi lặn phi thường, đục thủng thuyền giặc dưới nước.',
  },
  {
    id: 'da_tuong',
    label: 'Person',
    type: 'person',
    name: 'Dã Tượng',
    nameEn: 'Dã Tượng',
    year: 'TK XIII',
    yearStart: 1285,
    yearEnd: 1288,
    summary:
      'Gia tướng trung thành của Trần Hưng Đạo, nổi tiếng dũng mãnh và mưu trí trong các trận đánh.',
  },

  // ── Tướng Nguyên – Mông ──
  {
    id: 'hot_tat_liet',
    label: 'Enemy',
    type: 'enemy',
    name: 'Hốt Tất Liệt',
    nameEn: 'Kublai Khan',
    year: '1215–1294',
    yearStart: 1271,
    yearEnd: 1294,
    summary:
      'Hoàng đế khai sáng nhà Nguyên, người ra lệnh ba lần đem quân xâm lược Đại Việt nhằm mở đường xuống Đông Nam Á.',
  },
  {
    id: 'thoat_hoan',
    label: 'Enemy',
    type: 'enemy',
    name: 'Thoát Hoan',
    nameEn: 'Toghan',
    year: 'TK XIII',
    yearStart: 1285,
    yearEnd: 1288,
    summary:
      'Con trai Hốt Tất Liệt, Trấn Nam Vương, tổng chỉ huy quân Nguyên trong hai lần xâm lược 1285 và 1288; phải chui ống đồng tháo chạy về nước.',
  },
  {
    id: 'o_ma_nhi',
    label: 'Enemy',
    type: 'enemy',
    name: 'Ô Mã Nhi',
    nameEn: 'Omar',
    year: 'TK XIII',
    yearStart: 1287,
    yearEnd: 1288,
    summary:
      'Tướng thủy quân Nguyên, bị bắt sống trong trận Bạch Đằng 1288.',
  },
  {
    id: 'toa_do',
    label: 'Enemy',
    type: 'enemy',
    name: 'Toa Đô',
    nameEn: 'Sogetu',
    year: 'TK XIII',
    yearStart: 1285,
    yearEnd: 1285,
    summary:
      'Tướng Nguyên đánh lên từ phía nam (Chiêm Thành), bị chém đầu trong trận Tây Kết 1285.',
  },
  {
    id: 'truong_van_ho',
    label: 'Enemy',
    type: 'enemy',
    name: 'Trương Văn Hổ',
    nameEn: 'Zhang Wenhu',
    year: 'TK XIII',
    yearStart: 1287,
    yearEnd: 1288,
    summary:
      'Tướng chỉ huy đoàn thuyền lương Nguyên, bị Trần Khánh Dư đánh tan ở Vân Đồn (1287).',
  },

  // ── Sự kiện / chiến dịch ──
  {
    id: 'khang_chien_1',
    label: 'Event',
    type: 'event',
    name: 'Kháng chiến lần 1',
    nameEn: 'First resistance war',
    year: '1258',
    yearStart: 1258,
    yearEnd: 1258,
    summary:
      'Cuộc kháng chiến chống quân Nguyên–Mông lần thứ nhất, đỉnh cao là trận Đông Bộ Đầu giải phóng Thăng Long.',
  },
  {
    id: 'khang_chien_2',
    label: 'Event',
    type: 'event',
    name: 'Kháng chiến lần 2',
    nameEn: 'Second resistance war',
    year: '1285',
    yearStart: 1285,
    yearEnd: 1285,
    summary:
      'Cuộc kháng chiến chống 50 vạn quân Thoát Hoan, với các chiến thắng Hàm Tử, Chương Dương, Tây Kết.',
  },
  {
    id: 'khang_chien_3',
    label: 'Event',
    type: 'event',
    name: 'Kháng chiến lần 3',
    nameEn: 'Third resistance war',
    year: '1287–1288',
    yearStart: 1287,
    yearEnd: 1288,
    summary:
      'Cuộc kháng chiến kết thúc bằng đại thắng Bạch Đằng 1288, đập tan hoàn toàn ý đồ xâm lược của nhà Nguyên.',
  },
  {
    id: 'hoi_nghi_binh_than',
    label: 'Event',
    type: 'event',
    name: 'Hội nghị Bình Than',
    nameEn: 'Bình Than Conference',
    year: '1282',
    yearStart: 1282,
    yearEnd: 1282,
    lat: 21.05,
    lng: 106.2,
    province: 'Bắc Ninh',
    mapPoint: true,
    summary:
      'Hội nghị quân sự các vương hầu bàn kế chống giặc; nơi Trần Quốc Toản bóp nát quả cam vì còn nhỏ không được dự.',
  },
  {
    id: 'hoi_nghi_dien_hong',
    label: 'Event',
    type: 'event',
    name: 'Hội nghị Diên Hồng',
    nameEn: 'Diên Hồng Conference',
    year: '1284',
    yearStart: 1284,
    yearEnd: 1284,
    lat: 21.03,
    lng: 105.84,
    province: 'Thăng Long',
    mapPoint: true,
    summary:
      'Thái thượng hoàng Trần Thánh Tông mời các bô lão cả nước hỏi kế đánh hay hoà — tất cả đồng thanh "Đánh!". Biểu tượng của ý chí toàn dân.',
  },

  // ── Trận đánh (battle) — có toạ độ ──
  {
    id: 'dong_bo_dau_1258',
    label: 'Event',
    type: 'battle',
    name: 'Trận Đông Bộ Đầu',
    nameEn: 'Battle of Đông Bộ Đầu',
    year: '1258',
    yearStart: 1258,
    yearEnd: 1258,
    lat: 21.043,
    lng: 105.852,
    province: 'Thăng Long',
    mapPoint: true,
    summary:
      'Trận phản công đêm giải phóng kinh thành Thăng Long, kết thúc thắng lợi cuộc kháng chiến lần thứ nhất (1258).',
  },
  {
    id: 'ham_tu_1285',
    label: 'Event',
    type: 'battle',
    name: 'Trận Hàm Tử',
    nameEn: 'Battle of Hàm Tử',
    year: '1285',
    yearStart: 1285,
    yearEnd: 1285,
    lat: 20.78,
    lng: 105.97,
    province: 'Hưng Yên',
    mapPoint: true,
    summary:
      'Trần Nhật Duật chỉ huy đánh tan quân Nguyên ở cửa Hàm Tử, mở màn cho cuộc phản công chiến lược 1285.',
  },
  {
    id: 'chuong_duong_1285',
    label: 'Event',
    type: 'battle',
    name: 'Trận Chương Dương',
    nameEn: 'Battle of Chương Dương',
    year: '1285',
    yearStart: 1285,
    yearEnd: 1285,
    lat: 20.87,
    lng: 105.86,
    province: 'Hà Nội',
    mapPoint: true,
    summary:
      'Trần Quang Khải chỉ huy đánh chiếm bến Chương Dương, dọn đường tiến vào giải phóng Thăng Long.',
  },
  {
    id: 'tay_ket_1285',
    label: 'Event',
    type: 'battle',
    name: 'Trận Tây Kết',
    nameEn: 'Battle of Tây Kết',
    year: '1285',
    yearStart: 1285,
    yearEnd: 1285,
    lat: 20.75,
    lng: 105.98,
    province: 'Hưng Yên',
    mapPoint: true,
    summary:
      'Quân Trần tiêu diệt cánh quân Toa Đô; chủ tướng Toa Đô bị chém đầu, khép lại cuộc kháng chiến lần 2.',
  },
  {
    id: 'van_don_1287',
    label: 'Event',
    type: 'battle',
    name: 'Trận Vân Đồn',
    nameEn: 'Battle of Vân Đồn',
    year: '1287',
    yearStart: 1287,
    yearEnd: 1287,
    lat: 21.06,
    lng: 107.42,
    province: 'Quảng Ninh',
    mapPoint: true,
    summary:
      'Trần Khánh Dư tiêu diệt đoàn thuyền lương khổng lồ của Trương Văn Hổ — đòn hậu cần quyết định khiến quân Nguyên lâm vào cảnh đói.',
  },
  {
    id: 'bach_dang_1288',
    label: 'Event',
    type: 'battle',
    name: 'Trận Bạch Đằng',
    nameEn: 'Battle of Bạch Đằng (1288)',
    year: '1288',
    yearStart: 1288,
    yearEnd: 1288,
    lat: 20.92,
    lng: 106.78,
    province: 'Quảng Ninh – Hải Phòng',
    mapPoint: true,
    summary:
      'Đại thắng kinh điển: Trần Hưng Đạo dùng kế cắm cọc gỗ lợi dụng thuỷ triều, tiêu diệt và bắt sống toàn bộ thuỷ quân Nguyên, bắt Ô Mã Nhi.',
  },

  // ── Địa điểm (place) ──
  {
    id: 'thang_long',
    label: 'Place',
    type: 'capital',
    name: 'Thăng Long',
    nameEn: 'Thăng Long Citadel',
    year: '1010–nay',
    yearStart: 1010,
    yearEnd: 1400,
    lat: 21.028,
    lng: 105.834,
    province: 'Hà Nội',
    mapPoint: true,
    summary:
      'Kinh đô Đại Việt thời Trần; ba lần bị quân Nguyên chiếm rồi đều được quân dân nhà Trần giải phóng.',
  },
  {
    id: 'van_kiep',
    label: 'Place',
    type: 'capital',
    name: 'Vạn Kiếp',
    nameEn: 'Vạn Kiếp',
    year: 'TK XIII',
    yearStart: 1283,
    yearEnd: 1288,
    lat: 21.12,
    lng: 106.36,
    province: 'Hải Dương',
    mapPoint: true,
    summary:
      'Đại bản doanh của Trần Hưng Đạo, căn cứ thuỷ – bộ trọng yếu án ngữ đường tiến quân của giặc về Thăng Long.',
  },
  {
    id: 'thien_truong',
    label: 'Place',
    type: 'capital',
    name: 'Phủ Thiên Trường',
    nameEn: 'Thiên Trường',
    year: 'TK XIII',
    yearStart: 1239,
    yearEnd: 1400,
    lat: 20.42,
    lng: 106.18,
    province: 'Nam Định',
    mapPoint: true,
    summary:
      'Quê hương và "kinh đô thứ hai" của nhà Trần, nơi các Thái thượng hoàng lui về và là hậu phương vững chắc trong kháng chiến.',
  },

  // ── Di tích (heritage) còn lại đến nay ──
  {
    id: 'den_kiep_bac',
    label: 'Heritage',
    type: 'heritage',
    name: 'Đền Kiếp Bạc',
    nameEn: 'Kiếp Bạc Temple',
    year: '1300–nay',
    yearStart: 1300,
    yearEnd: 2025,
    lat: 21.12,
    lng: 106.36,
    province: 'Hải Dương',
    mapPoint: true,
    summary:
      'Đền thờ Hưng Đạo Đại Vương Trần Quốc Tuấn tại Vạn Kiếp, một trong những di tích thờ Trần Hưng Đạo lớn nhất cả nước.',
  },
  {
    id: 'den_tran_nam_dinh',
    label: 'Heritage',
    type: 'heritage',
    name: 'Đền Trần (Nam Định)',
    nameEn: 'Trần Temple, Nam Định',
    year: '1695–nay',
    yearStart: 1695,
    yearEnd: 2025,
    lat: 20.43,
    lng: 106.18,
    province: 'Nam Định',
    mapPoint: true,
    summary:
      'Khu đền thờ 14 vị vua Trần trên đất phát tích Thiên Trường, nổi tiếng với lễ Khai ấn đầu xuân.',
  },
  {
    id: 'bai_coc_bach_dang',
    label: 'Heritage',
    type: 'heritage',
    name: 'Bãi cọc Bạch Đằng',
    nameEn: 'Bạch Đằng Stake Yard',
    year: '1288–nay',
    yearStart: 1288,
    yearEnd: 2025,
    lat: 20.95,
    lng: 106.75,
    province: 'Quảng Ninh',
    mapPoint: true,
    summary:
      'Di tích bãi cọc gỗ lim đóng dưới lòng sông trong trận Bạch Đằng 1288, bằng chứng khảo cổ cho chiến thuật thiên tài của Trần Hưng Đạo.',
  },
  {
    id: 'hoang_thanh_thang_long',
    label: 'Heritage',
    type: 'heritage',
    name: 'Hoàng thành Thăng Long',
    nameEn: 'Imperial Citadel of Thăng Long',
    year: '1010–nay',
    yearStart: 1010,
    yearEnd: 2025,
    lat: 21.035,
    lng: 105.84,
    province: 'Hà Nội',
    mapPoint: true,
    summary:
      'Trung tâm quyền lực Đại Việt qua nhiều triều đại trong đó có nhà Trần; Di sản Văn hoá Thế giới UNESCO 2010.',
  },

  // ── Di vật / tác phẩm (artifact) ──
  {
    id: 'hich_tuong_si',
    label: 'Artifact',
    type: 'artifact',
    name: 'Hịch tướng sĩ',
    nameEn: 'Hịch tướng sĩ',
    year: '1284',
    yearStart: 1284,
    yearEnd: 1284,
    summary:
      'Bài hịch bất hủ của Trần Hưng Đạo khích lệ tướng sĩ trước cuộc kháng chiến lần 2, áng văn chính luận tiêu biểu của văn học Việt Nam.',
  },
  {
    id: 'binh_thu_yeu_luoc',
    label: 'Artifact',
    type: 'artifact',
    name: 'Binh thư yếu lược',
    nameEn: 'Binh thư yếu lược',
    year: 'TK XIII',
    yearStart: 1285,
    yearEnd: 1300,
    summary:
      'Bộ binh thư do Trần Hưng Đạo biên soạn, tổng kết nghệ thuật quân sự để huấn luyện tướng sĩ.',
  },
  {
    id: 'coc_go_bach_dang',
    label: 'Artifact',
    type: 'artifact',
    name: 'Trận địa cọc Bạch Đằng',
    nameEn: 'Bạch Đằng stakes tactic',
    year: '1288',
    yearStart: 1288,
    yearEnd: 1288,
    summary:
      'Chiến thuật đóng cọc gỗ bịt sắt dưới lòng sông, lợi dụng thuỷ triều lên xuống để nhấn chìm chiến thuyền địch.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EDGES (quan hệ)
// ─────────────────────────────────────────────────────────────────────────────
export const EDGES: GraphEdge[] = [
  // Vua & hoàng tộc thuộc nhà Trần
  { from: 'tran_thai_tong', to: 'nha_tran', relation: 'BELONGS_TO' },
  { from: 'tran_thanh_tong', to: 'nha_tran', relation: 'BELONGS_TO' },
  { from: 'tran_nhan_tong', to: 'nha_tran', relation: 'BELONGS_TO' },
  { from: 'tran_hung_dao', to: 'nha_tran', relation: 'BELONGS_TO' },
  { from: 'tran_quang_khai', to: 'nha_tran', relation: 'BELONGS_TO' },
  { from: 'tran_nhat_duat', to: 'nha_tran', relation: 'BELONGS_TO' },
  { from: 'tran_quoc_toan', to: 'nha_tran', relation: 'BELONGS_TO' },
  { from: 'tran_binh_trong', to: 'nha_tran', relation: 'BELONGS_TO' },
  { from: 'tran_khanh_du', to: 'nha_tran', relation: 'BELONGS_TO' },
  { from: 'tran_thu_do', to: 'nha_tran', relation: 'BELONGS_TO' },
  { from: 'pham_ngu_lao', to: 'nha_tran', relation: 'SERVED' },
  { from: 'yet_kieu', to: 'tran_hung_dao', relation: 'SERVED' },
  { from: 'da_tuong', to: 'tran_hung_dao', relation: 'SERVED' },
  { from: 'pham_ngu_lao', to: 'tran_hung_dao', relation: 'SERVED' },

  // Vua trị vì kinh đô
  { from: 'tran_thai_tong', to: 'thang_long', relation: 'RULED_FROM' },
  { from: 'tran_nhan_tong', to: 'thang_long', relation: 'RULED_FROM' },
  { from: 'nha_tran', to: 'thang_long', relation: 'CAPITAL_AT' },
  { from: 'nha_tran', to: 'thien_truong', relation: 'ORIGINATED_FROM' },

  // Kháng chiến do nhà Trần tiến hành, chống Nguyên–Mông
  { from: 'nha_tran', to: 'khang_chien_1', relation: 'FOUGHT' },
  { from: 'nha_tran', to: 'khang_chien_2', relation: 'FOUGHT' },
  { from: 'nha_tran', to: 'khang_chien_3', relation: 'FOUGHT' },
  { from: 'khang_chien_1', to: 'de_quoc_nguyen_mong', relation: 'AGAINST' },
  { from: 'khang_chien_2', to: 'de_quoc_nguyen_mong', relation: 'AGAINST' },
  { from: 'khang_chien_3', to: 'de_quoc_nguyen_mong', relation: 'AGAINST' },
  { from: 'hot_tat_liet', to: 'de_quoc_nguyen_mong', relation: 'RULED' },

  // Trận đánh thuộc từng chiến dịch
  { from: 'dong_bo_dau_1258', to: 'khang_chien_1', relation: 'PART_OF' },
  { from: 'ham_tu_1285', to: 'khang_chien_2', relation: 'PART_OF' },
  { from: 'chuong_duong_1285', to: 'khang_chien_2', relation: 'PART_OF' },
  { from: 'tay_ket_1285', to: 'khang_chien_2', relation: 'PART_OF' },
  { from: 'van_don_1287', to: 'khang_chien_3', relation: 'PART_OF' },
  { from: 'bach_dang_1288', to: 'khang_chien_3', relation: 'PART_OF' },

  // Chỉ huy trận đánh
  { from: 'tran_thai_tong', to: 'dong_bo_dau_1258', relation: 'COMMANDED' },
  { from: 'tran_thu_do', to: 'khang_chien_1', relation: 'ADVISED' },
  { from: 'tran_nhat_duat', to: 'ham_tu_1285', relation: 'COMMANDED' },
  { from: 'tran_quang_khai', to: 'chuong_duong_1285', relation: 'COMMANDED' },
  { from: 'tran_quoc_toan', to: 'chuong_duong_1285', relation: 'FOUGHT_IN' },
  { from: 'tran_hung_dao', to: 'tay_ket_1285', relation: 'COMMANDED' },
  { from: 'tran_khanh_du', to: 'van_don_1287', relation: 'COMMANDED' },
  { from: 'tran_hung_dao', to: 'bach_dang_1288', relation: 'COMMANDED' },
  { from: 'tran_nhan_tong', to: 'bach_dang_1288', relation: 'LED' },
  { from: 'tran_thanh_tong', to: 'bach_dang_1288', relation: 'LED' },
  { from: 'yet_kieu', to: 'bach_dang_1288', relation: 'FOUGHT_IN' },
  { from: 'da_tuong', to: 'bach_dang_1288', relation: 'FOUGHT_IN' },
  { from: 'pham_ngu_lao', to: 'bach_dang_1288', relation: 'FOUGHT_IN' },

  // Trận đánh diễn ra tại địa điểm
  { from: 'dong_bo_dau_1258', to: 'thang_long', relation: 'LOCATED_AT' },
  { from: 'bach_dang_1288', to: 'van_kiep', relation: 'STAGED_FROM' },

  // Kẻ địch trong trận đánh
  { from: 'bach_dang_1288', to: 'o_ma_nhi', relation: 'CAPTURED' },
  { from: 'bach_dang_1288', to: 'thoat_hoan', relation: 'DEFEATED' },
  { from: 'tay_ket_1285', to: 'toa_do', relation: 'DEFEATED' },
  { from: 'van_don_1287', to: 'truong_van_ho', relation: 'DEFEATED' },
  { from: 'thoat_hoan', to: 'de_quoc_nguyen_mong', relation: 'GENERAL_OF' },
  { from: 'o_ma_nhi', to: 'de_quoc_nguyen_mong', relation: 'GENERAL_OF' },
  { from: 'toa_do', to: 'de_quoc_nguyen_mong', relation: 'GENERAL_OF' },
  { from: 'truong_van_ho', to: 'de_quoc_nguyen_mong', relation: 'GENERAL_OF' },
  { from: 'hot_tat_liet', to: 'khang_chien_2', relation: 'ORDERED' },
  { from: 'hot_tat_liet', to: 'khang_chien_3', relation: 'ORDERED' },

  // Hội nghị
  { from: 'tran_quoc_toan', to: 'hoi_nghi_binh_than', relation: 'RELATED_TO' },
  { from: 'tran_thanh_tong', to: 'hoi_nghi_dien_hong', relation: 'CONVENED' },
  { from: 'hoi_nghi_dien_hong', to: 'khang_chien_2', relation: 'PRECEDED' },
  { from: 'hoi_nghi_binh_than', to: 'khang_chien_2', relation: 'PRECEDED' },

  // Tác phẩm / di vật
  { from: 'tran_hung_dao', to: 'hich_tuong_si', relation: 'AUTHORED' },
  { from: 'tran_hung_dao', to: 'binh_thu_yeu_luoc', relation: 'AUTHORED' },
  { from: 'hich_tuong_si', to: 'khang_chien_2', relation: 'INSPIRED' },
  { from: 'tran_hung_dao', to: 'coc_go_bach_dang', relation: 'DEVISED' },
  { from: 'coc_go_bach_dang', to: 'bach_dang_1288', relation: 'USED_IN' },

  // Di tích tưởng niệm / gắn với nhân vật & trận đánh
  { from: 'den_kiep_bac', to: 'tran_hung_dao', relation: 'COMMEMORATES' },
  { from: 'den_kiep_bac', to: 'van_kiep', relation: 'LOCATED_AT' },
  { from: 'den_tran_nam_dinh', to: 'nha_tran', relation: 'COMMEMORATES' },
  { from: 'den_tran_nam_dinh', to: 'thien_truong', relation: 'LOCATED_AT' },
  { from: 'bai_coc_bach_dang', to: 'bach_dang_1288', relation: 'COMMEMORATES' },
  { from: 'hoang_thanh_thang_long', to: 'thang_long', relation: 'PART_OF' },
  { from: 'tran_binh_trong', to: 'khang_chien_2', relation: 'FOUGHT_IN' },
];

export const ERA_LABEL = 'Nhà Trần · Kháng chiến chống Nguyên–Mông';
export const TIMELINE_RANGE = { min: 1225, max: 1300 };
