import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();
    const rid      = (request.headers['x-request-id'] as string | undefined) ?? '-';
    const route    = `${request.method} ${request.url}`;

    // ── Mongoose CastError (invalid ObjectId) → 400 ─────────────────────────
    if (exception instanceof MongooseError.CastError) {
      if (!IS_PRODUCTION) {
        this.logger.debug(`[400] CastError rid=${rid} ${route} — ${exception.message}`);
      }
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp:  new Date().toISOString(),
        message:    'ID invalid',
      });
    }

    // ── Mongoose ValidationError → 400 ──────────────────────────────────────
    if (exception instanceof MongooseError.ValidationError) {
      const messages = Object.values(exception.errors).map((e) => e.message);
      if (!IS_PRODUCTION) {
        this.logger.debug(`[400] ValidationError rid=${rid} ${route} — ${messages.join(', ')}`);
      }
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp:  new Date().toISOString(),
        message:    messages.length === 1 ? messages[0] : messages,
      });
    }

    // ── MongoDB duplicate key (E11000) → 409 ────────────────────────────────
    if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      (exception as any).code === 11000
    ) {
      if (!IS_PRODUCTION) {
        this.logger.debug(`[409] DuplicateKey rid=${rid} ${route}`);
      }
      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        timestamp:  new Date().toISOString(),
        message:    'Înregistrare duplicată',
      });
    }

    // ── HttpException (NestJS / class-validator) ─────────────────────────────
    if (exception instanceof HttpException) {
      const status    = exception.getStatus();
      const exResponse = exception.getResponse();

      if (!IS_PRODUCTION) {
        // In dev: log all 4xx too — useful for debugging auth, validation, etc.
        const msg = typeof exResponse === 'string'
          ? exResponse
          : (exResponse as any)?.message ?? exception.message;
        if (status >= 500) {
          this.logger.error(`[${status}] rid=${rid} ${route} — ${msg}`, exception.stack);
        } else if (status >= 400) {
          this.logger.warn(`[${status}] rid=${rid} ${route} — ${msg}`);
        }
      } else if (status >= 500) {
        // Production: only log 5xx (4xx are expected user-facing errors)
        this.logger.error(`[${status}] rid=${rid} ${route} — ${exception.message}`, exception.stack);
      }

      return response.status(status).json({
        statusCode: status,
        timestamp:  new Date().toISOString(),
        ...(typeof exResponse === 'string' ? { message: exResponse } : (exResponse as object)),
      });
    }

    // ── Unknown / unhandled exception → 500 ─────────────────────────────────
    const stack = exception instanceof Error ? exception.stack : undefined;
    const msg   = exception instanceof Error ? exception.message : String(exception);

    // Always log unhandled exceptions in both environments
    this.logger.error(
      `[500] Unhandled exception rid=${rid} ${route} — ${msg}`,
      stack,
    );

    // In dev: also dump the raw exception object for maximum visibility
    if (!IS_PRODUCTION && !(exception instanceof Error)) {
      this.logger.debug('Raw exception object:', JSON.stringify(exception, null, 2));
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp:  new Date().toISOString(),
      message:    'Eroare internă de server',
    });
  }
}
