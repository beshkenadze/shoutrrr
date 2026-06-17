import type { EnumFormatter, Logger } from "./types.js";

/**
 * Standard is the base logging helper that services embed, porting Go
 * services/standard.Standard + Logger.
 */
export class Standard implements Logger {
  private logger?: Logger;

  setLogger(logger?: Logger): void {
    this.logger = logger;
  }

  logf(format: string, ...args: unknown[]): void {
    this.logger?.logf(format, ...args);
  }

  /** log mirrors Go Service.Log: forwards a single value to the logger. */
  log(...args: unknown[]): void {
    this.logger?.logf("%s", ...args);
  }
}

/** EnumlessConfig is embedded by configs that expose no enum fields. */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
