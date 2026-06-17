import type { EnumFormatter, Logger } from './types.js';

// Standard — faithful port of Go pkg/services/standard.
// Provides a logger that formats with %v/%s/%d-style placeholders, discarding when unset.
export class Standard implements Logger {
  private logger: Logger | undefined;

  setLogger(logger: Logger | undefined): void {
    this.logger = logger;
  }

  logf(format: string, ...args: unknown[]): void {
    this.logger?.logf(format, ...args);
  }
}

// EnumlessConfig — base for configs with no enum fields.
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}

// DiscardLogger — a no-op logger used when none is provided.
export const discardLogger: Logger = {
  logf(): void {
    /* discard */
  },
};
