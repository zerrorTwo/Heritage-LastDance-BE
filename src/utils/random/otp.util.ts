import * as crypto from 'crypto';

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt to avoid modulo bias.
 */
export const generateOTP = (): string => {
  const num = crypto.randomInt(0, 1_000_000);
  return num.toString().padStart(6, '0');
};
