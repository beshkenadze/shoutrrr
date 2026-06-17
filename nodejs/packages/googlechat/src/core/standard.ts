// Faithful port of Go pkg/services/standard.
import type { EnumFormatter, Logger } from './types.js';

/**
 * Standard implements the Logger part of the Service interface.
 * Logf formats using Go-style %-verbs collapsed to a simple printf shim.
 */
export class Standard implements Logger {
  private logger?: Logger;

  setLogger(logger?: Logger): void {
    this.logger = logger;
  }

  logf(format: string, ...args: unknown[]): void {
    if (this.logger) {
      this.logger.logf(format, ...args);
    }
  }
}

/** EnumlessConfig implements the enums() part for services without enum fields. */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
