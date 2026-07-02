import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { McpTokenRepository } from './repository';

@Injectable()
export class McpTokenService {
  constructor(private readonly tokenRepo: McpTokenRepository) {}

  /** Generate a cryptographically secure token with usr_ prefix. */
  private generateToken(): string {
    return `usr_${randomBytes(32).toString('hex')}`;
  }

  /**
   * Create a new MCP token for a user.
   * Returns the full token value — this is the ONLY time the raw token is returned.
   */
  async createToken(userId: string, name: string, scopes?: string[]) {
    const token = this.generateToken();
    const record = await this.tokenRepo.create(userId, token, name, scopes);
    return {
      id: record.id,
      name: record.name,
      token: record.token,
      scopes: record.scopes,
      createdAt: record.createdAt,
    };
  }

  /** List all tokens for a user (token value is masked for security). */
  async listTokens(userId: string) {
    const tokens = await this.tokenRepo.findByUserId(userId);
    return tokens.map((t) => ({
      id: t.id,
      name: t.name,
      tokenPreview: `${t.token.slice(0, 8)}...${t.token.slice(-4)}`,
      scopes: t.scopes,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt,
    }));
  }

  /** Revoke (delete) a token. */
  async revokeToken(tokenId: string, userId: string) {
    const deleted = await this.tokenRepo.delete(tokenId, userId);
    if (!deleted) throw new NotFoundException('Token not found');
    return { success: true };
  }

  /**
   * Verify an MCP token — called by the AI Service via internal API.
   * Returns the user context if valid, or null if not.
   */
  async verifyToken(token: string) {
    const record = await this.tokenRepo.findByToken(token);
    if (!record || !record.user || !record.user.isActive) return null;

    // Update last used timestamp (fire-and-forget)
    this.tokenRepo.updateLastUsed(record.id).catch(() => {});

    return {
      userId: record.user.id,
      email: record.user.email,
      name: record.user.displayname,
      avatar: record.user.avatar,
      scopes: record.scopes || [],
    };
  }
}
