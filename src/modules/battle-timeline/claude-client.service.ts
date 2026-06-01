import { BadGatewayException, Injectable } from '@nestjs/common';

type ClaudeMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ClaudeResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: unknown;
};

@Injectable()
export class ClaudeClientService {
  private readonly apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  private readonly baseUrl = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
  private readonly model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

  async complete(params: {
    system: string;
    user: string;
    maxTokens?: number;
    messages?: ClaudeMessage[];
  }): Promise<string> {
    if (!this.apiKey) {
      throw new BadGatewayException('ANTHROPIC_API_KEY is not configured');
    }

    const messages: ClaudeMessage[] = params.messages ?? [
      { role: 'user', content: params.user },
    ];

    let response: globalThis.Response;
    try {
      response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': process.env.ANTHROPIC_VERSION || '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          system: params.system,
          messages,
          max_tokens: params.maxTokens ?? 4096,
          stream: false,
        }),
      });
    } catch (error) {
      throw new BadGatewayException(
        `Cannot connect to Claude API at ${this.baseUrl}: ${(error as Error).message}`,
      );
    }

    const payload = (await response.json()) as ClaudeResponse;
    if (!response.ok) {
      throw new BadGatewayException(
        `Claude API error (${response.status}): ${JSON.stringify(payload.error ?? response.statusText)}`,
      );
    }

    const text = payload.content
      ?.filter((part) => part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('')
      .trim();

    if (!text) {
      throw new BadGatewayException('Claude returned an empty response');
    }

    return text;
  }
}
