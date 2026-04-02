import { LoggerService, LogLevel } from '@nestjs/common';

const isProduction = process.env.NODE_ENV === 'production';

const LEVEL_MAP: Record<string, string> = {
  log: 'info',
  error: 'error',
  warn: 'warn',
  debug: 'debug',
  verbose: 'verbose',
};

export class AppLogger implements LoggerService {
  private write(level: string, message: unknown, context?: string, stack?: string) {
    if (isProduction) {
      const entry: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        level: LEVEL_MAP[level] ?? level,
        context,
        message: message instanceof Error ? message.message : String(message),
      };
      if (stack) entry.stack = stack;
      if (message instanceof Error && message.stack) entry.stack = message.stack;
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      const ts = new Date().toISOString();
      const ctx = context ? ` [${context}]` : '';
      const prefix = `${ts}${ctx}`;
      if (level === 'error') {
        console.error(`\x1b[31m[ERROR]\x1b[0m ${prefix}`, message);
        if (stack) console.error(stack);
      } else if (level === 'warn') {
        console.warn(`\x1b[33m[WARN]\x1b[0m  ${prefix}`, message);
      } else {
        console.log(`\x1b[32m[${level.toUpperCase().padEnd(5)}]\x1b[0m ${prefix}`, message);
      }
    }
  }

  log(message: unknown, context?: string) { this.write('log', message, context); }
  error(message: unknown, stack?: string, context?: string) { this.write('error', message, context, stack); }
  warn(message: unknown, context?: string) { this.write('warn', message, context); }
  debug(message: unknown, context?: string) { this.write('debug', message, context); }
  verbose(message: unknown, context?: string) { this.write('verbose', message, context); }

  setLogLevels?(_levels: LogLevel[]) { /* noop */ }
}
