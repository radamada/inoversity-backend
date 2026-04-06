import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Requests that take longer than this threshold are flagged as [SLOW].
 * Override via SLOW_REQUEST_MS env var.
 *
 * Production: warning emitted even if status is 2xx
 * Development: added as a tag to the log line
 */
const SLOW_MS = Number(process.env.SLOW_REQUEST_MS ?? 1000);

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req  = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const start     = Date.now();
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? '-';

    // ── Development: log incoming request for full traceability ─────────────
    if (!IS_PRODUCTION) {
      const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
      const ua = req.headers['user-agent'] ?? '-';
      this.logger.verbose(
        `→ ${method} ${url} | ip=${ip} rid=${requestId} ua="${ua}"`,
      );
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const res    = context.switchToHttp().getResponse<Response>();
          const ms     = Date.now() - start;
          const status = res.statusCode;
          const isSlow = ms >= SLOW_MS;
          const slowTag = isSlow ? ' [SLOW]' : '';
          const line   = `${method} ${url} ${status} +${ms}ms${slowTag} rid=${requestId}`;

          if (IS_PRODUCTION) {
            // Production: only log errors and slow requests to reduce noise
            if (status >= 500) {
              this.logger.error(line);
            } else if (status >= 400 || isSlow) {
              this.logger.warn(line);
            }
            // 2xx/3xx without slowness → no log (handled by infra metrics)
          } else {
            // Development: log everything, level reflects severity
            if (status >= 500)      this.logger.error(line);
            else if (status >= 400) this.logger.warn(line);
            else if (isSlow)        this.logger.warn(line);
            else                    this.logger.log(line);
          }
        },

        error: (err) => {
          const ms     = Date.now() - start;
          const status = (err?.status as number | undefined) ?? 500;
          const line   = `${method} ${url} ${status} +${ms}ms rid=${requestId} — ${err?.message ?? String(err)}`;
          if (status >= 500) this.logger.error(line);
          else               this.logger.warn(line);
        },
      }),
    );
  }
}
