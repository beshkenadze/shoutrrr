import type { EnumFormatter, Logger } from './types.js';

// Standard is the shared logger base, faithful port of Go pkg/services/standard.
export class Standard implements Logger {
  private logger: Logger | undefined;

  setLogger(logger?: Logger): void {
    this.logger = logger;
  }

  logf(format: string, ...args: unknown[]): void {
    this.logger?.logf(format, ...args);
  }
}

// EnumlessConfig is embedded by configs that expose no enum fields.
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
