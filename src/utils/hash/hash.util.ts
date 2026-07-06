import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/** Hash a plain-text string with bcrypt (default cost = 10). */
export const hashBcrypt = (plain: string, rounds = 10): Promise<string> =>
  bcrypt.hash(plain, rounds);

/** Compare a plain-text string against a bcrypt hash. */
export const compareBcrypt = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

/**
 * Compute an MD5 hex digest.
 * Used to hash raw refresh tokens before storing in DB.
 * NOTE: MD5 is intentionally used here for token lookup only — not for passwords.
 */
export const md5 = (input: string): string =>
  crypto.createHash('md5').update(input).digest('hex');
