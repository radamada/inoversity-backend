import { LoggerService, LogLevel } from '@nestjs/common';
import { createStream, RotatingFileStream } from 'rotating-file-stream';
import { mkdirSync } from 'fs';
import { join } from 'path';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ── Log levels ordered by severity ──────────────────────────────────────────
type Level = 'error' | 'warn' | 'log' | 'debug' | 'verbose';

const LEVEL_PRIORITY: Record<Level, number> = {
  error:   0,
  warn:    1,
  log:     2,  // = info
  debug:   3,
  verbose: 4,  // = trace
};

/**
 * Minimum log level resolved from LOG_LEVEL env var.
 * Defaults:
 *   production  → 'log'     (error + warn + info)
 *   development → 'verbose' (everything)
 */
function resolveMinLevel(): Level {
  const env = (process.env.LOG_LEVEL ?? '').toLowerCase() as Level;
  if (env in LEVEL_PRIORITY) return env;
  return IS_PRODUCTION ? 'log' : 'verbose';
}

// ── Dev console colors ───────────────────────────────────────────────────────
const COLOR: Record<string, string> = {
  error:   '\x1b[31m',
  warn:    '\x1b[33m',
  log:     '\x1b[32m',
  debug:   '\x1b[36m',
  verbose: '\x1b[35m',
  dim:     '\x1b[90m',
  reset:   '\x1b[0m',
};

const LABEL: Record<Level, string> = {
  error:   'ERROR',
  warn:    'WARN ',
  log:     'INFO ',
  debug:   'DEBUG',
  verbose: 'TRACE',
};

const JSON_LEVEL: Record<Level, string> = {
  error:   'error',
  warn:    'warn',
  log:     'info',
  debug:   'debug',
  verbose: 'trace',
};

// ── Rotating file stream factory ─────────────────────────────────────────────
/**
 * File rotation configuration (override via env vars):
 *
 *   LOG_DIR       – directory for log files       (default: ./logs)
 *   LOG_MAX_SIZE  – rotate when file exceeds this (default: 20M)
 *   LOG_MAX_FILES – how many rotated files to keep (default: 10)
 *
 * File naming:
 *   app.log           ← current file
 *   app.1.log         ← previous rotation
 *   app.2.log         ← …
 *   app.10.log        ← oldest kept (11th gets deleted)
 *
 * Rotated files are compressed with gzip to save disk space.
 */
function createLogStream(): RotatingFileStream {
  const logDir   = process.env.LOG_DIR ?? join(process.cwd(), 'logs');
  const maxSize  = process.env.LOG_MAX_SIZE ?? '20M';
  const maxFiles = Number(process.env.LOG_MAX_FILES ?? 10);

  // Ensure the log directory exists
  mkdirSync(logDir, { recursive: true });

  const generator = (_time: number | Date, index?: number): string => {
    if (!index) return 'app.log';
    return `app.${index}.log`;
  };

  return createStream(generator, {
    path:     logDir,
    size:     maxSize,       // rotate when file reaches this size
    maxFiles,                // keep at most N rotated files
    compress: 'gzip',        // compress rotated files (.gz)
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export class AppLogger implements LoggerService {
  private readonly minPriority: number;
  private readonly fileStream: RotatingFileStream | null;

  constructor() {
    this.minPriority = LEVEL_PRIORITY[resolveMinLevel()];

    // File stream: active in production always; in dev only if LOG_DIR is set explicitly
    const shouldWriteToFile = IS_PRODUCTION || !!process.env.LOG_DIR;
    this.fileStream = shouldWriteToFile ? createLogStream() : null;

    this.fileStream?.on('error', (err) => {
      // Fall back to stderr so we never lose the error silently
      process.stderr.write(`[AppLogger] File stream error: ${err.message}\n`);
    });
  }

  private shouldLog(level: Level): boolean {
    return LEVEL_PRIORITY[level] <= this.minPriority;
  }

  private write(level: Level, message: unknown, context?: string, stack?: string): void {
    if (!this.shouldLog(level)) return;

    // ── File / structured JSON output ────────────────────────────────────────
    if (this.fileStream) {
      const entry: Record<string, unknown> = {
        time:  new Date().toISOString(),
        level: JSON_LEVEL[level],
        ctx:   context ?? null,
        msg:   message instanceof Error ? message.message : String(message),
      };
      if (stack) {
        entry.stack = stack;
      } else if (message instanceof Error && message.stack) {
        entry.stack = message.stack;
      }
      this.fileStream.write(JSON.stringify(entry) + '\n');
    }

    // ── Console output ───────────────────────────────────────────────────────
    if (IS_PRODUCTION) {
      // In production also write to stdout for PM2 / container log collectors
      const entry: Record<string, unknown> = {
        time:  new Date().toISOString(),
        level: JSON_LEVEL[level],
        ctx:   context ?? null,
        msg:   message instanceof Error ? message.message : String(message),
      };
      const s = stack ?? (message instanceof Error ? message.stack : undefined);
      if (s) entry.stack = s;
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      // Development: colored human-readable console
      const ts  = new Date().toISOString().slice(11, 23); // HH:mm:ss.mmm
      const ctx = context ? `${COLOR.dim}[${context}]${COLOR.reset} ` : '';
      const c   = COLOR[level];
      const r   = COLOR.reset;
      const lbl = `${c}[${LABEL[level]}]${r}`;

      if (level === 'error') {
        console.error(`${lbl} ${ts} ${ctx}`, message);
        const s = stack ?? (message instanceof Error ? message.stack : undefined);
        if (s) console.error(`${c}${s}${r}`);
      } else if (level === 'warn') {
        console.warn(`${lbl} ${ts} ${ctx}`, message);
      } else if (level === 'debug' || level === 'verbose') {
        console.debug(`${lbl} ${ts} ${ctx}`, message);
      } else {
        console.log(`${lbl} ${ts} ${ctx}`, message);
      }
    }
  }

  // ── NestJS LoggerService interface ────────────────────────────────────────

  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    this.write('error', message, context, stack);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setLogLevels?(_levels: LogLevel[]): void { /* controlled via LOG_LEVEL env */ }
}
