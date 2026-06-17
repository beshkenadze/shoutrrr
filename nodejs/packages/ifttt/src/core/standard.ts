import type { EnumFormatter, Logger } from "./types.js";

/**
 * Standard provides the shared Logger behavior for services, ported from Go
 * pkg/services/standard. logf is a no-op until setLogger installs a logger.
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

/**
 * EnumlessConfig implements the enums() portion of ServiceConfig for services
 * that do not use enum fields, ported from Go standard.EnumlessConfig.
 */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
