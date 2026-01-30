/**
 * Simple logger utility
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  timestamps?: boolean;
}

export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level ?? LogLevel.INFO,
      prefix: config.prefix,
      timestamps: config.timestamps ?? true,
    };
  }

  private formatMessage(level: string, message: string, ...args: unknown[]): string {
    const parts: string[] = [];

    if (this.config.timestamps) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    if (this.config.prefix) {
      parts.push(`[${this.config.prefix}]`);
    }

    parts.push(`[${level}]`);
    parts.push(message);

    return parts.join(' ') + (args.length > 0 ? ' ' + args.map(String).join(' ') : '');
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.DEBUG) {
      console.info(this.formatMessage('DEBUG', message, ...args));
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, ...args));
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, ...args));
    }
  }

  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix,
    });
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
}

// Default logger instance
export const logger = new Logger();
