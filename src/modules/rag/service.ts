import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ImportKnowledgeDto,
  QueryKnowledgeDto,
  SearchKnowledgeDto,
  WikiListDto,
} from './dto/rag.dto';

type AiSearchResult = {
  slug: string;
  title: string;
  summary?: string;
  page_type?: string;
  knowledge_type_slugs?: string[];
  updated_at?: string;
  similarity?: number;
};

type AiSearchResponse = {
  query: string;
  total: number;
  results: AiSearchResult[];
};

type AiWikiDetail = AiSearchResult & {
  content_md?: string;
  backlinks?: string[];
  outlinks?: string[];
};

type RagSource = {
  slug: string;
  title: string;
  summary: string;
  pageType: string;
  similarity?: number;
};

type AiQueryResponse = {
  answer: string;
  mode: string;
  sources: RagSource[];
  wikiLinks: Array<{
    slug: string;
    title: string;
  }>;
  citations?: Array<{
    sourceId: string;
    title: string;
    page?: number;
    snippet: string;
    evidenceType: string;
    score?: number;
  }>;
  rawSources?: Array<{
    sourceId: string;
    title: string;
    sourceType: string;
    fileName?: string;
    url?: string;
  }>;
};

/** Shape needed to mirror a heritage item into the AI knowledge base. */
export type HeritageSyncInput = {
  id: string;
  slug: string;
  title: string;
  status?: string;
  summary?: string | null;
  content?: string | null;
  type?: string | null;
  history?: string | null;
  architecture?: string | null;
  culturalSignificance?: string | null;
  constructionPeriod?: string | null;
  founder?: string | null;
  legends?: string | null;
  alternativeNames?: string[] | null;
  sourceUrl?: string | null;
  // Optional location enrichment (from heritage_locations)
  address?: string | null;
  province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly baseUrl = (process.env.AI_SERVICE_URL || 'http://localhost:5055').replace(/\/$/, '');
  private readonly token = process.env.AI_SERVICE_TOKEN;
  private readonly chatMode = process.env.AI_CHAT_MODE || 'search_only';

  /**
   * Mirror a published heritage item into the AI wiki knowledge base so the
   * chatbot stays in sync with the CMS. Fail-soft: never throws — a missing
   * AI service or token must not break heritage CRUD.
   */
  async syncHeritage(item: HeritageSyncInput): Promise<void> {
    if (!this.token) {
      this.logger.warn('Skip heritage sync: AI_SERVICE_TOKEN not configured');
      return;
    }
    const payload = {
      heritageId: item.id,
      slug: item.slug,
      title: item.title,
      summary: item.summary ?? undefined,
      content: item.content ?? undefined,
      type: item.type ?? undefined,
      history: item.history ?? undefined,
      architecture: item.architecture ?? undefined,
      culturalSignificance: item.culturalSignificance ?? undefined,
      constructionPeriod: item.constructionPeriod ?? undefined,
      founder: item.founder ?? undefined,
      legends: item.legends ?? undefined,
      alternativeNames: item.alternativeNames ?? [],
      address: item.address ?? undefined,
      province: item.province ?? undefined,
      latitude: item.latitude ?? undefined,
      longitude: item.longitude ?? undefined,
      sourceUrl: item.sourceUrl ?? undefined,
    };
    try {
      const res = await this.requestAi<{ wikiSlug: string; status: string; embedded: boolean }>(
        '/api/heritage/sync',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      );
      this.logger.log(`Heritage synced -> AI: ${res.wikiSlug} (${res.status}, embedded=${res.embedded})`);
    } catch (error) {
      this.logger.warn(`Heritage sync failed for slug=${item.slug}: ${(error as Error).message}`);
    }
  }

  /** Remove a heritage item from the AI knowledge base (unpublish/delete). Fail-soft. */
  async removeHeritage(slug: string): Promise<void> {
    if (!this.token || !slug) return;
    try {
      await this.requestAi(`/api/heritage/sync/${encodeURIComponent(slug)}`, { method: 'DELETE' });
      this.logger.log(`Heritage removed from AI: di-tich-${slug}`);
    } catch (error) {
      this.logger.warn(`Heritage remove failed for slug=${slug}: ${(error as Error).message}`);
    }
  }

  async importKnowledge(file: Express.Multer.File | undefined, dto: ImportKnowledgeDto) {
    if (!file && !dto.url) {
      throw new BadRequestException('Provide either a document file or a URL');
    }

    const form = new FormData();
    if (file) {
      form.append(
        'file',
        new Blob([new Uint8Array(file.buffer)], {
          type: file.mimetype || 'application/octet-stream',
        }),
        file.originalname,
      );
    }
    if (dto.url) form.append('url', dto.url);
    if (dto.title) form.append('title', dto.title);
    if (dto.knowledgeType) form.append('knowledge_type', dto.knowledgeType);

    return this.requestAi('/api/heritage/import', {
      method: 'POST',
      body: form,
    });
  }

  async getProgress(sourceId: string) {
    return this.requestAi(`/api/heritage/sources/${encodeURIComponent(sourceId)}/progress`);
  }

  async search(dto: SearchKnowledgeDto): Promise<AiSearchResponse> {
    const params = new URLSearchParams({
      q: dto.q,
      limit: String(dto.limit || 10),
    });
    if (dto.pageType) params.set('page_type', dto.pageType);
    return this.requestAi(`/api/heritage/search?${params.toString()}`);
  }

  async listWiki(dto: WikiListDto) {
    const params = new URLSearchParams({
      limit: String(dto.limit || 50),
      offset: String(dto.offset || 0),
    });
    if (dto.pageType) params.set('page_type', dto.pageType);
    return this.requestAi(`/api/heritage/wiki?${params.toString()}`);
  }

  async getWikiPage(slug: string): Promise<AiWikiDetail> {
    return this.requestAi(`/api/heritage/wiki/${encodeURIComponent(slug)}`);
  }

  async query(dto: QueryKnowledgeDto) {
    if (this.chatMode === 'llm_9router') {
      try {
        return await this.queryWithAiService(dto);
      } catch (error) {
        console.warn(
          'RagService llm_9router query failed, falling back to search_only:',
          (error as Error).message,
        );
      }
    }

    const topK = dto.topK || 5;
    const search = await this.search({ q: dto.question, limit: topK });
    const sources = this.mapSources(search.results || []);
    const wikiLinks = sources.map((source) => ({
      slug: source.slug,
      title: source.title,
    }));

    if (!sources.length) {
      return {
        answer:
          'Hiện tại kho tri thức chưa có dữ liệu đủ liên quan để trả lời câu hỏi này. Anh có thể import thêm tài liệu lịch sử phù hợp rồi thử lại.',
        mode: this.chatMode,
        sources: [],
        wikiLinks: [],
        citations: [],
        rawSources: [],
      };
    }

    const details = await this.loadTopWikiDetails(sources.slice(0, Math.min(3, topK)));
    const answer = this.composeSearchOnlyAnswer(dto.question, details, sources);

    return {
      answer,
      mode: this.chatMode,
      sources,
      wikiLinks,
      citations: [],
      rawSources: [],
    };
  }

  private async queryWithAiService(dto: QueryKnowledgeDto): Promise<AiQueryResponse> {
    const payload: Record<string, unknown> = {
      question: dto.question,
      topK: dto.topK || 5,
    };
    if (dto.heritageId) payload.heritageId = dto.heritageId;
    if (dto.language) payload.language = dto.language;

    return this.requestAi<AiQueryResponse>('/api/heritage/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  private async loadTopWikiDetails(sources: RagSource[]) {
    const settled = await Promise.allSettled(
      sources.map((source) => this.getWikiPage(source.slug)),
    );
    return settled
      .filter((item): item is PromiseFulfilledResult<AiWikiDetail> => item.status === 'fulfilled')
      .map((item) => item.value);
  }

  private composeSearchOnlyAnswer(
    question: string,
    details: AiWikiDetail[],
    fallbackSources: RagSource[],
  ) {
    if (!details.length) {
      const titles = fallbackSources.map((source) => `- ${source.title}: ${source.summary}`).join('\n');
      return `Em tìm thấy một số trang wiki liên quan đến câu hỏi "${question}", nhưng chưa đọc được nội dung chi tiết:\n\n${titles}`;
    }

    const sections = details.map((page) => {
      const excerpt = this.toPlainExcerpt(page.content_md || page.summary || '', 900);
      return `### ${page.title}\n${excerpt}\n\nNguồn: ${page.slug}`;
    });

    return [
      `Dựa trên các trang wiki hiện có trong kho tri thức, đây là phần thông tin liên quan nhất cho câu hỏi: "${question}".`,
      '',
      sections.join('\n\n'),
      '',
      'Ghi chú: chế độ hiện tại là search_only, nên câu trả lời được tổng hợp trực tiếp từ các trang wiki liên quan thay vì agent MCP nhiều bước.',
    ].join('\n');
  }

  private toPlainExcerpt(markdown: string, maxLength: number) {
    const plain = markdown
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/[#>*_`-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (plain.length <= maxLength) return plain;
    return `${plain.slice(0, maxLength).trim()}...`;
  }

  private mapSources(results: AiSearchResult[]): RagSource[] {
    return results.map((item) => ({
      slug: item.slug,
      title: item.title,
      summary: item.summary || '',
      pageType: item.page_type || 'wiki',
      similarity: item.similarity,
    }));
  }

  private async requestAi<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.token) {
      throw new ServiceUnavailableException('AI_SERVICE_TOKEN is not configured on Heritage BE');
    }

    let response: globalThis.Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.token}`,
          ...(init.headers || {}),
        },
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        `Cannot connect to AI service at ${this.baseUrl}: ${(error as Error).message}`,
      );
    }

    const payload = await this.readPayload(response);
    if (!response.ok) {
      const detail =
        typeof payload === 'object' && payload !== null && 'detail' in payload
          ? String((payload as { detail: unknown }).detail)
          : response.statusText;
      throw new BadGatewayException(`AI service error (${response.status}): ${detail}`);
    }

    return payload as T;
  }

  private async readPayload(response: globalThis.Response) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
}
