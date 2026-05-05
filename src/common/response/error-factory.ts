import { HttpError } from './http-error';

/**
 * Error factory functions.
 *
 * ALWAYS use these instead of `new BadRequestException(...)`,
 * `errors.New(...)`, or any raw error construction in services.
 *
 * @example
 * if (!user) return newNotFoundError('User not found');
 */

export const newBadRequestError = (message: string): HttpError =>
  new HttpError(400, message);

export const newUnauthorizedError = (internal?: Error | unknown): HttpError =>
  new HttpError(401, 'Unauthorized', internal);

export const newForbiddenError = (message = 'Forbidden'): HttpError =>
  new HttpError(403, message);

export const newNotFoundError = (message: string): HttpError =>
  new HttpError(404, message);

export const newConflictError = (message: string): HttpError =>
  new HttpError(409, message);

export const newTooManyRequestsError = (
  message = 'Too many requests',
  internal?: Error | unknown,
): HttpError => new HttpError(429, message, internal);

export const newInternalServerError = (internal: Error | unknown): HttpError =>
  new HttpError(500, 'Internal server error', internal);
