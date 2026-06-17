// Faithful port of Go pkg/services/standard.

import type { EnumFormatter, Logger } from './types.js';

/** Standard implements the Logger part of the Service interface. */
export class Standard implements Logger {
  protected logger: Logger | undefined;

  /** setLogger sets the logger used by logf; a nil logger discards output. */
  setLogger(logger?: Logger): void {
    this.logger = logger;
  }

  /** logf forwards to the configured logger, or discards when none is set. */
  logf(format: string, ...args: unknown[]): void {
    this.logger?.logf(format, ...args);
  }
}

/** EnumlessConfig provides enums() for configs that use no enum fields. */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
