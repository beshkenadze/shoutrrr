import type { EnumFormatter, Logger } from './types.js';

/**
 * Standard provides the Logger implementation shared by services, ported from
 * Go's pkg/services/standard. A nil/undefined logger discards output.
 */
export class Standard implements Logger {
  private logger?: Logger;

  setLogger(logger?: Logger): void {
    this.logger = logger;
  }

  logf(format: string, ...args: unknown[]): void {
    this.logger?.logf(format, ...args);
  }
}

/** EnumlessConfig implements the enums() part of ServiceConfig for enum-free services. */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
