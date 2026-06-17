// Faithful port of Go pkg/services/standard (Logger + EnumlessConfig parts).
import type { EnumFormatter, Logger } from './types.js';

/** Standard implements the Logger part of the Service interface. */
export class Standard implements Logger {
  protected logger?: Logger;

  setLogger(l: Logger): void {
    this.logger = l;
  }

  logf(f: string, ...a: unknown[]): void {
    this.logger?.logf(f, ...a);
  }
}

/** EnumlessConfig is mixed into configs that have no enum fields. */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
