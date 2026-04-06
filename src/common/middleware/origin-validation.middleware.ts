import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';

/** HTTP methods that cannot mutate server state — skip CSRF check for these. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Origin Validation Middleware — defense-in-depth against CSRF.
 *
 * For every state-changing request (POST / PUT / PATCH / DELETE) it checks
 * that the `Origin` header (set automatically by the browser) belongs to an
 * allowed origin.  Requests without an `Origin` header are allowed through
 * because they cannot originate from a browser form or fetch (server-to-server
 * calls, curl, Stripe webhooks, etc. don't send Origin).
 *
 * Combined with:
 *   • SameSite: strict cookies  → browser won't send cookies cross-site
 *   • Bearer JWT on all main endpoints → CSRF-immune by design
 *   • Strict CORS policy (already in main.ts)
 *
 * this gives three independent layers of CSRF protection.
 */
@Injectable()
export class OriginValidationMiddleware implements NestMiddleware {
  private readonly allowedOrigins: Set<string>;
  private readonly isProd: boolean;

  constructor(config: ConfigService) {
    this.isProd = config.get('NODE_ENV') === 'production';
    const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    // Normalise: strip trailing slash
    this.allowedOrigins = new Set([frontendUrl.replace(/\/$/, '')]);
  }

  use(req: Request, _res: Response, next: NextFunction): void {
    // Safe methods cannot mutate state — no check needed
    if (SAFE_METHODS.has(req.method)) return next();

    // Stripe webhook and other server-to-server calls — no Origin, verified
    // by their own signature mechanism
    if (req.path.includes('/webhook')) return next();

    const origin = req.headers['origin'];

    // No Origin header → server-to-server or same-origin request; allow through
    if (!origin) return next();

    // Exact match against whitelist
    if (this.allowedOrigins.has(origin)) return next();

    // Development: also allow any localhost origin (any port)
    if (!this.isProd && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return next();

    throw new ForbiddenException('Origine neautorizată');
  }
}
