/**
 * HttpError — carries HTTP status code, a client-safe message, and an optional
 * internal cause that is logged server-side only (never sent to the client).
 *
 * Services MUST use the factory functions in error-factory.ts instead of
 * throwing raw NestJS HttpExceptions or plain Error objects.
 */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    /** Internal cause — logged but NEVER exposed to the client. */
    public readonly internal?: Error | unknown,
  ) {
    super(message);
    this.name = 'HttpError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
