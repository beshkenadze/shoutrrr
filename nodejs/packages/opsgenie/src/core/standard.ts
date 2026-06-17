import type { EnumFormatter, Logger } from "./types.js";

/**
 * Standard is the base for services, providing logger plumbing.
 * Faithful port of Go's pkg/services/standard.Standard + Logger.
 */
export class Standard implements Logger {
  protected logger: Logger | undefined;

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
