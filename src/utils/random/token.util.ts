import * as crypto from 'crypto';

/**
 * Generate a raw refresh token — 64 hex characters (32 bytes).
 * This is stored MD5-hashed in the DB; the raw value is returned to the client.
 */
export const generateRefreshToken = (): string =>
  crypto.randomBytes(32).toString('hex');

/**
 * Generate a secure verify/reset token — 32 hex characters (16 bytes) by default.
 * Used for verifyToken (signup) and resetToken (forgot-password).
 * NEVER expose AuthChallenge.id; use this token instead.
 */
export const generateSecureToken = (bytes = 16): string =>
  crypto.randomBytes(bytes).toString('hex');
