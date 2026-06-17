import type { EnumFormatter, Logger } from './types.js';

/**
 * Standard is the shared logging implementation for services
 * (port of services/standard.Standard + Logger). A nil logger discards output.
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

/** EnumlessConfig is the base for configs that declare no enum fields. */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
