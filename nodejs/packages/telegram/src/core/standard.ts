// Faithful port of Go pkg/services/standard (the bits services embed).
import type { EnumFormatter, Logger } from './types.js';

/** Standard provides a default Logger implementation services can embed. */
export class Standard implements Logger {
  private logger: Logger | undefined;

  setLogger(logger?: Logger): void {
    this.logger = logger;
  }

  logf(format: string, ...args: unknown[]): void {
    this.logger?.logf(format, ...args);
  }
}

/** EnumlessConfig is a base for configs that expose no enum fields. */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
