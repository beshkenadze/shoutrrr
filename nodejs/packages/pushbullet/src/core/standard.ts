// Vendored core kit — faithful port of Go pkg/services/standard.

import type { EnumFormatter, Logger } from './types.js';

/** Standard provides the Logger part of the Service interface (mirrors standard.Standard). */
export class Standard implements Logger {
  private logger?: Logger;

  setLogger(logger?: Logger): void {
    this.logger = logger;
  }

  logf(format: string, ...args: unknown[]): void {
    this.logger?.logf(format, ...args);
  }
}

/** EnumlessConfig implements enums() for services that do not use enum fields. */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
