import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Unified response envelope for all 2xx responses.
 *
 * Shape: { status: 'success', data, message }
 */
export interface ApiResponse<T> {
  status: 'success';
  data: T;
  message: string;
}

/**
 * ResponseInterceptor
 *
 * Wraps every successful (non-exception) controller response into the
 * project-wide response envelope.
 *
 * Services may return:
 *   - { data, message } → unwrapped and re-wrapped
 *   - anything else     → placed directly in `data`
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((result: unknown): ApiResponse<T> => {
        if (
          result !== null &&
          typeof result === 'object' &&
          'data' in (result as object)
        ) {
          const shaped = result as { data: T; message?: string };
          return {
            status: 'success',
            data: shaped.data,
            message: shaped.message ?? 'OK',
          };
        }

        return {
          status: 'success',
          data: result as T,
          message: 'OK',
        };
      }),
    );
  }
}
