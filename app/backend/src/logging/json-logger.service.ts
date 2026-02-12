import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';
import { getRequestId } from './request-context';

type JsonLogPayload = {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  request_id?: string;
  trace?: string;
  details?: unknown;
};

@Injectable()
export class JsonLogger extends ConsoleLogger {
  constructor() {
    super(undefined, {
      logLevels: resolveLogLevels(),
    });
  }

  log(message: unknown, context?: string) {
    this.write('INFO', message, context);
  }

  warn(message: unknown, context?: string) {
    this.write('WARN', message, context);
  }

  debug(message: unknown, context?: string) {
    this.write('DEBUG', message, context);
  }

  verbose(message: unknown, context?: string) {
    this.write('VERBOSE', message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.write('ERROR', message, context, trace);
  }

  private write(level: string, message: unknown, context?: string, trace?: string) {
    const payload: JsonLogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message: toLogMessage(message),
    };

    if (context) {
      payload.context = context;
    }

    const requestId = getRequestId();
    if (requestId) {
      payload.request_id = requestId;
    }

    if (trace) {
      payload.trace = trace;
    }

    if (isObjectLike(message)) {
      payload.details = message;
    }

    process.stdout.write(`${JSON.stringify(payload)}\n`);
  }
}

function resolveLogLevels(): LogLevel[] {
  const configured = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  const map: Record<string, LogLevel[]> = {
    error: ['error', 'warn'],
    warn: ['warn', 'error', 'log'],
    info: ['log', 'warn', 'error'],
    debug: ['debug', 'log', 'warn', 'error'],
    verbose: ['verbose', 'debug', 'log', 'warn', 'error'],
    log: ['log', 'warn', 'error'],
  };

  return map[configured] ?? map.info;
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toLogMessage(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  if (isObjectLike(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return '[unserializable object]';
    }
  }
  return String(value);
}
