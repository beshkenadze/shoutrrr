// Vendored from Go pkg/services/standard.
import type { Logger } from './types.js';

/**
 * Standard is the default Logger implementation (Go: standard.Standard).
 * It defers to an injected logger, falling back to a no-op until one is set.
 */
export class Standard implements Logger {
  private logger: Logger | undefined;

  setLogger(logger?: Logger): void {
    this.logger = logger;
  }

  logf(format: string, ...args: unknown[]): void {
    this.logger?.logf(format, ...args);
  }
}

/** EnumlessConfig is a mixin base for configs without enums (Go: standard.EnumlessConfig). */
export class EnumlessConfig {
  enums(): Record<string, never> {
    return {};
  }
}
