import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { createHash } from 'crypto';
import { GenerateMindMapDto } from './dto/generate-mind-map.dto';
import { PromptBuilder } from './prompt.builder';
import { ResponseValidator } from './response.validator';

type MindMapNode = {
  id: string;
  label: string;
  description?: string;
  children: MindMapNode[];
};

type MindMapResponse = {
  title: string;
  mindMap: MindMapNode;
};

type DeepSeekMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type DeepSeekChoice = {
  message: {
    content: string;
  };
};

type DeepSeekApiResponse = {
  choices: DeepSeekChoice[];
};

@Injectable()
export class MindMapService {
  private readonly baseUrl = (
    process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
  ).replace(/\/$/, '');

  private readonly apiKey = process.env.DEEPSEEK_API_KEY;
  private readonly model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly promptBuilder: PromptBuilder,
    private readonly validator: ResponseValidator,
  ) {}

  async generate(dto: GenerateMindMapDto): Promise<MindMapResponse> {
    const cacheKey = this.buildCacheKey(dto.text, dto.language, dto.level, dto.topicType);

    const cached = await this.cacheManager.get<MindMapResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const prompt = this.promptBuilder.build(dto);

    let result = await this.callDeepSeek(prompt, false);

    let validation = this.validator.validate(result);

    if (!validation.valid) {
      const strictPrompt = this.buildStrictRetryPrompt(prompt, validation.errors);
      const retryResult = await this.callDeepSeek(strictPrompt, true);
      validation = this.validator.validate(retryResult);
    }

    if (!validation.valid) {
      throw new Error(
        `DeepSeek returned invalid JSON after retry: ${validation.errors.join('; ')}`,
      );
    }

    await this.cacheManager.set(cacheKey, validation.data, 3600 * 1000);

    return validation.data;
  }

  private buildCacheKey(
    text: string,
    language?: string,
    level?: string,
    topicType?: string,
  ): string {
    const raw = `${text}|${language || 'vi'}|${level || 'intermediate'}|${topicType || 'history'}`;
    const hash = createHash('md5').update(raw).digest('hex');
    return `mindmap:${hash}`;
  }

  private async callDeepSeek(
    prompt: { system: string; user: string },
    isRetry: boolean,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    const messages: DeepSeekMessage[] = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ];

    if (isRetry) {
      messages.unshift({
        role: 'system',
        content: 'LẦN TRƯỚC BẠN TRẢ VỀ JSON KHÔNG HỢP LỆ. LẦN NÀY PHẢI TRẢ VỀ JSON ĐÚNG CẤU TRÚC.',
      });
    }

    let response: globalThis.Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });
    } catch (error) {
      throw new Error(
        `Cannot connect to DeepSeek API at ${this.baseUrl}: ${(error as Error).message}`,
      );
    }

    const payload = (await response.json()) as DeepSeekApiResponse;

    if (!response.ok || !payload.choices?.length) {
      const errorDetail =
        (payload as unknown as Record<string, unknown>).error
          ? JSON.stringify((payload as unknown as Record<string, unknown>).error)
          : response.statusText;
      throw new Error(
        `DeepSeek API error (${response.status}): ${errorDetail}`,
      );
    }

    const content = payload.choices[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek returned an empty response');
    }

    return content;
  }

  private buildStrictRetryPrompt(
    original: { system: string; user: string },
    errors: string[],
  ): { system: string; user: string } {
    const errorList = errors.map((e) => `- ${e}`).join('\n');

    const strictSystem = [
      original.system,
      '',
      'CẢNH BÁO: Phản hồi trước của bạn bị TỪ CHỐI vì các lỗi sau:',
      errorList,
      '',
      'HÃY SỬA CÁC LỖI TRÊN và trả về JSON hợp lệ. Đặc biệt:',
      '- Đảm bảo mọi node đều có id duy nhất',
      '- Đảm bảo nhãn ngắn gọn (dưới 15 từ)',
      '- Đảm bảo độ sâu không quá 4 cấp',
      '- Chỉ trả về JSON thuần',
    ].join('\n');

    return { system: strictSystem, user: original.user };
  }
}
