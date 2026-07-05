/**
 * DI injection tokens for repository interfaces.
 * Services depend on these tokens, not on concrete implementations.
 * This enables easy database/implementation swapping (Dependency Inversion Principle).
 */
export const USER_REPOSITORY = 'USER_REPOSITORY';
export const AUTH_CHALLENGE_REPOSITORY = 'AUTH_CHALLENGE_REPOSITORY';
export const SESSION_REPOSITORY = 'SESSION_REPOSITORY';
export const AUDIT_LOG_REPOSITORY = 'AUDIT_LOG_REPOSITORY';
