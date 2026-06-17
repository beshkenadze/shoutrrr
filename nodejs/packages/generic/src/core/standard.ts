import type { EnumFormatter, Logger } from './types.js';

/**
 * Standard implements the Logger part of the Service interface, faithful port of Go
 * `pkg/services/standard`. A nil logger discards output (matching DiscardLogger).
 */
export class Standard implements Logger {
  private logger?: Logger;

  setLogger(logger?: Logger): void {
    this.logger = logger;
  }

  /** logf formats and logs a message, mirroring Go `Logger.Logf`. */
  logf(format: string, ...args: unknown[]): void {
    this.logger?.logf(format, ...args);
  }

  /**
   * log joins its arguments and logs them, mirroring Go `Logger.Log` which uses `fmt.Sprint`:
   * a space is inserted between two operands only when neither is a string.
   */
  log(...args: unknown[]): void {
    let out = '';
    for (let i = 0; i < args.length; i++) {
      if (i > 0 && typeof args[i - 1] !== 'string' && typeof args[i] !== 'string') {
        out += ' ';
      }
      out += String(args[i]);
    }
    this.logger?.logf('%s', out);
  }
}

/** EnumlessConfig implements the enums() part of ServiceConfig for services without enum fields. */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
