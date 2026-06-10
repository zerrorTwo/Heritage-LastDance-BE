import { Injectable, Logger } from '@nestjs/common';
import { NODES, EDGES, GraphNode } from './seed/tran-dynasty.dataset';

/**
 * PersonaService (A3) — "Chatbot nhân vật lịch sử nhập vai".
 *
 * Cho phép trò chuyện với một nhân vật trong knowledge graph (vd Trần Hưng Đạo).
 * - Nếu cấu hình LLM (DEEPSEEK_API_KEY) -> gọi LLM streaming, đóng vai đúng giọng
 *   thời đại, GROUNDED bằng dữ liệu graph để không bịa.
 * - Nếu KHÔNG có LLM -> sinh câu trả lời nhập vai từ chính dữ liệu graph
 *   (bio + quan hệ + khớp từ khoá) rồi stream từng cụm chữ để mô phỏng trải nghiệm.
 *
 * Nhờ vậy tính năng luôn chạy được khi demo và tự nâng cấp khi có API key.
 */
@Injectable()
export class PersonaService {
  private readonly logger = new Logger(PersonaService.name);
  private readonly nodeById = new Map<string, GraphNode>(NODES.map((n) => [n.id, n]));
  // LLM qua 9Router (OpenAI-compatible). Bật mặc định; nếu không kết nối được sẽ tự fallback offline.
  private readonly llmEnabled = (process.env.PERSONA_LLM_ENABLED ?? 'true') !== 'false';
  private readonly baseUrl = (process.env.NINEROUTER_URL || 'http://localhost:20128').replace(/\/$/, '');
  private readonly apiKey = process.env.NINEROUTER_KEY || '';
  private readonly model = process.env.NINEROUTER_MODEL || 'Gemini';

  /** Danh sách nhân vật có thể trò chuyện. */
  listPersonas() {
    return NODES.filter((n) => n.type === 'person').map((n) => ({
      id: n.id,
      name: n.name,
      year: n.year,
      summary: n.summary,
    }));
  }

  getPersona(id: string) {
    const n = this.nodeById.get(id);
    if (!n || n.type !== 'person') return null;
    return { id: n.id, name: n.name, year: n.year, summary: n.summary, relations: this.relationsOf(id) };
  }

  hasLLM(): boolean {
    return this.llmEnabled;
  }

  /** Quan hệ 1-hop của nhân vật, diễn giải sang câu tự nhiên. */
  private relationsOf(id: string) {
    const out: { relation: string; direction: 'in' | 'out'; node: GraphNode }[] = [];
    for (const e of EDGES) {
      if (e.from === id && this.nodeById.has(e.to))
        out.push({ relation: e.relation, direction: 'out', node: this.nodeById.get(e.to)! });
      else if (e.to === id && this.nodeById.has(e.from))
        out.push({ relation: e.relation, direction: 'in', node: this.nodeById.get(e.from)! });
    }
    return out;
  }

  /**
   * Stream câu trả lời. Gọi onDelta(text) nhiều lần, kết thúc trả về full text.
   */
  async streamAnswer(
    id: string,
    question: string,
    onDelta: (t: string) => void,
  ): Promise<{ persona: string; grounded: boolean; mode: 'llm' | 'offline' }> {
    const persona = this.nodeById.get(id);
    if (!persona) throw new Error('persona_not_found');

    const context = this.buildContext(id, question);

    let llmError: string | undefined;
    if (this.llmEnabled) {
      try {
        await this.streamFromLLM(persona, question, context, onDelta);
        return { persona: persona.name, grounded: true, mode: 'llm' };
      } catch (err) {
        llmError = (err as Error).message;
        this.logger.warn(`LLM (9router) lỗi, fallback offline: ${llmError}`);
      }
    }

    const text = this.composeOfflineAnswer(persona, question, context);
    await this.streamWords(text, onDelta);
    return { persona: persona.name, grounded: true, mode: 'offline', llmError } as any;
  }

  // ── Context grounding: bio nhân vật + quan hệ + node khớp từ khoá câu hỏi ──
  private buildContext(id: string, question: string): string[] {
    const persona = this.nodeById.get(id)!;
    const rels = this.relationsOf(id);
    const facts: string[] = [`${persona.name} (${persona.year}): ${persona.summary}`];
    for (const r of rels) {
      facts.push(`${this.relationPhrase(r.relation, r.direction)} ${r.node.name} — ${r.node.summary}`);
    }
    // bổ sung node khác khớp từ khoá
    const qWords = this.tokenize(question);
    for (const n of NODES) {
      if (n.id === id) continue;
      const hay = this.tokenize(`${n.name} ${n.summary}`);
      if (qWords.some((w) => hay.includes(w))) {
        facts.push(`${n.name}: ${n.summary}`);
      }
    }
    return [...new Set(facts)].slice(0, 14);
  }

  private relationPhrase(rel: string, dir: 'in' | 'out'): string {
    const map: Record<string, string> = {
      COMMANDED: 'chỉ huy trận',
      LED: 'lãnh đạo',
      FOUGHT_IN: 'tham chiến tại',
      AUTHORED: 'là tác giả của',
      DEVISED: 'bày ra kế',
      SERVED: dir === 'in' ? 'có thuộc tướng' : 'phò tá',
      BELONGS_TO: 'thuộc về',
      DEFEATED: 'đánh bại',
      CAPTURED: 'bắt sống',
      COMMEMORATES: dir === 'in' ? 'được thờ tại' : 'tưởng niệm',
      RULED_FROM: 'trị vì từ',
      CONVENED: 'triệu tập',
    };
    return map[rel] || 'liên quan tới';
  }

  // ── Trả lời nhập vai offline (grounded) ──
  private composeOfflineAnswer(persona: GraphNode, question: string, context: string[]): string {
    const rels = this.relationsOf(persona.id);
    const battles = rels.filter((r) => r.node.type === 'battle').map((r) => r.node);
    const works = rels.filter((r) => r.node.type === 'artifact').map((r) => r.node);
    const qWords = this.tokenize(question);

    // Tìm sự kiện/nhân vật được hỏi tới
    const mentioned = NODES.filter(
      (n) => n.id !== persona.id && this.tokenize(`${n.name}`).some((w) => qWords.includes(w)),
    );

    const lines: string[] = [];
    lines.push(`Ta là ${persona.name}. ${persona.summary}`);

    if (mentioned.length) {
      const m = mentioned[0];
      lines.push(`Ngươi hỏi về ${m.name}: ${m.summary}`);
      const link = rels.find((r) => r.node.id === m.id);
      if (link) {
        lines.push(`Với ta, đó là nơi ta ${this.relationPhrase(link.relation, link.direction)} ${m.name}.`);
      }
    } else if (battles.length) {
      lines.push(
        `Trong đời cầm quân, ta gắn với những trận như ${battles
          .map((b) => b.name)
          .join(', ')}. Mỗi trận là một bài học về lòng dân và thế nước.`,
      );
    }

    if (works.length && (qWords.includes('sach') || qWords.includes('viet') || qWords.includes('hich') || !mentioned.length)) {
      lines.push(`Ta để lại ${works.map((w) => w.name).join(', ')} để răn dạy tướng sĩ đời sau.`);
    }

    lines.push('Giặc mạnh đến đâu, nếu trên dưới một lòng, vua tôi đồng tâm thì ắt giữ được non sông.');
    return lines.join(' ');
  }

  private tokenize(s: string): string[] {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);
  }

  private async streamWords(text: string, onDelta: (t: string) => void) {
    const parts = text.split(/(\s+)/);
    for (const p of parts) {
      onDelta(p);
      await this.sleep(22);
    }
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ── LLM streaming (OpenAI-compatible: DeepSeek) ──
  private async streamFromLLM(
    persona: GraphNode,
    question: string,
    context: string[],
    onDelta: (t: string) => void,
  ) {
    const system = [
      `Bạn đang NHẬP VAI nhân vật lịch sử Việt Nam: ${persona.name} (${persona.year}).`,
      `Hãy xưng hô và dùng giọng văn trang trọng, cổ kính, phù hợp bối cảnh thế kỷ XIII thời Trần.`,
      `Chỉ trả lời dựa trên các dữ kiện lịch sử dưới đây, KHÔNG bịa đặt sự kiện hay con số.`,
      `Nếu không biết, hãy thành thật nói không rõ. Trả lời ngắn gọn 3-6 câu, bằng tiếng Việt.`,
      ``,
      `DỮ KIỆN (knowledge graph):`,
      ...context.map((c) => `- ${c}`),
    ].join('\n');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        stream: true,
        temperature: 0.6,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: question },
        ],
      }),
    });
    if (!res.ok || !res.body) throw new Error(`LLM HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) onDelta(delta);
        } catch {
          /* bỏ qua dòng không phải JSON */
        }
      }
    }
  }
}
