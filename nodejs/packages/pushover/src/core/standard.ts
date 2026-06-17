import type { EnumFormatter, Logger } from './types.js';

/**
 * Standard is the base logging helper embedded by services. It mirrors Go
 * services/standard.Standard / Logger: a no-op logger until one is set.
 */
export class Standard implements Logger {
  private logger: Logger | null = null;

  setLogger(logger?: Logger): void {
    this.logger = logger ?? null;
  }

  logf(format: string, ...args: unknown[]): void {
    this.logger?.logf(format, ...args);
  }
}

/** EnumlessConfig is a base for configs that expose no enum fields. */
export abstract class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
