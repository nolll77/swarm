type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  tenantId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export class Logger {
  private service: string;
  private minLevel: number;
  private context: Record<string, unknown>;

  constructor(service: string, minLevel: LogLevel = "info") {
    this.service = service;
    this.minLevel = LOG_LEVELS[minLevel];
    this.context = {};
  }

  withContext(ctx: Record<string, unknown>): Logger {
    const child = new Logger(this.service);
    child.minLevel = this.minLevel;
    child.context = { ...this.context, ...ctx };
    return child;
  }

  withTenant(tenantId: string): Logger {
    return this.withContext({ tenantId });
  }

  withRequestId(requestId: string): Logger {
    return this.withContext({ requestId });
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log("error", message, data);
  }

  fatal(message: string, data?: Record<string, unknown>): void {
    this.log("fatal", message, data);
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      ...this.context,
      ...data,
    };

    const output = JSON.stringify(entry);

    if (level === "error" || level === "fatal") {
      process.stderr.write(output + "\n");
    } else {
      process.stdout.write(output + "\n");
    }
  }
}

export function createLogger(service: string): Logger {
  const level = (process.env.LOG_LEVEL as LogLevel) || "info";
  return new Logger(service, level);
}
