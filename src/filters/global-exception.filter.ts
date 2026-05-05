import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpError } from '../common/response/http-error';

/**
 * GlobalExceptionFilter — the single entry point for all error handling.
 *
 * Equivalent to `response.Handle` from the backend convention doc.
 *
 * Decision table:
 * ┌─────────────────────────────┬─────────────────────────────────────────┐
 * │ Exception type              │ Action                                  │
 * ├─────────────────────────────┼─────────────────────────────────────────┤
 * │ HttpError 4xx               │ status='fail'  — no server log          │
 * │ HttpError 5xx               │ status='error' — log with trace         │
 * │ NestJS HttpException 4xx    │ status='fail'  — no server log          │
 * │ NestJS HttpException 5xx    │ status='error' — log with trace         │
 * │ Unknown / unhandled         │ status='error' 500 — log with trace     │
 * └─────────────────────────────┴─────────────────────────────────────────┘
 *
 * Rules:
 *  - `message` in response is ALWAYS client-safe
 *  - `internal` cause is NEVER sent to client — only logged
 *  - 5xx responses capture request trace (url, method, body ≤1KB)
 *    but exclude the Authorization header
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();

    const { statusCode, clientMessage, internalCause } =
      this.resolve(exception);

    const isServerError = statusCode >= 500;

    if (isServerError) {
      this.logServerError(request, statusCode, clientMessage, internalCause);
    }

    const status = isServerError ? 'error' : 'fail';

    response.status(statusCode).json({
      status,
      data: null,
      message: clientMessage,
    });
  }

  // ─── Resolution ────────────────────────────────────────────────────────────

  private resolve(exception: unknown): {
    statusCode: number;
    clientMessage: string;
    internalCause: unknown;
  } {
    // Our custom HttpError (from services)
    if (exception instanceof HttpError) {
      return {
        statusCode:    exception.statusCode,
        clientMessage: exception.message,
        internalCause: exception.internal ?? exception,
      };
    }

    // NestJS built-in HttpException (e.g., ValidationPipe errors)
    if (exception instanceof HttpException) {
      const status         = exception.getStatus();
      const exceptionBody  = exception.getResponse();
      const clientMessage  = this.extractNestMessage(exceptionBody);
      return {
        statusCode:    status,
        clientMessage,
        internalCause: exception,
      };
    }

    // Unknown / unhandled error
    return {
      statusCode:    HttpStatus.INTERNAL_SERVER_ERROR,
      clientMessage: 'Internal server error',
      internalCause: exception,
    };
  }

  private extractNestMessage(body: string | object): string {
    if (typeof body === 'string') return body;

    const obj = body as Record<string, unknown>;

    // ValidationPipe produces { message: string[] }
    if (Array.isArray(obj['message'])) {
      return (obj['message'] as string[]).join('; ');
    }

    if (typeof obj['message'] === 'string') return obj['message'];

    return 'Bad request';
  }

  // ─── Logging (5xx only) ────────────────────────────────────────────────────

  /**
   * Logs the request trace for 5xx errors.
   * EXCLUDES the Authorization header to avoid leaking tokens.
   * Truncates request body to 1 KB.
   */
  private logServerError(
    request: Request,
    statusCode: number,
    clientMessage: string,
    internalCause: unknown,
  ): void {
    const safeHeaders = { ...request.headers };
    delete safeHeaders['authorization'];

    const rawBody   = JSON.stringify(request.body ?? {});
    const safeBody  = rawBody.length > 1024
      ? rawBody.slice(0, 1024) + '... [truncated]'
      : rawBody;

    this.logger.error(
      `${statusCode} ${request.method} ${request.url} — ${clientMessage}`,
      JSON.stringify({
        url:    request.url,
        method: request.method,
        query:  request.query,
        params: request.params,
        body:   safeBody,
        headers: safeHeaders,
        cause:  internalCause instanceof Error
          ? { name: internalCause.name, message: internalCause.message, stack: internalCause.stack }
          : String(internalCause),
      }),
    );
  }
}
