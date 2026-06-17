// Ported from Go pkg/services/standard (logger.go, config_*.go).
import type { EnumFormatter, Logger } from './types.js';

/**
 * Standard provides a default Logger implementation. setLogger swaps in a real
 * logger; until then logf is a no-op (mirrors Go's DiscardLogger default).
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

/** EnumlessConfig is a base for configs that expose no enum formatters. */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
