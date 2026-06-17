import type { EnumFormatter, Logger } from './types.js';

/**
 * Standard provides the base logging behavior shared by services, mirroring
 * Go's standard.Standard / standard.Logger.
 */
export class Standard implements Logger {
  protected logger?: Logger;

  setLogger(l: Logger): void {
    this.logger = l;
  }

  logf(format: string, ...args: unknown[]): void {
    this.logger?.logf(format, ...args);
  }
}

/**
 * EnumlessConfig implements the enums() part of ServiceConfig for services that
 * do not use enum fields, mirroring Go's standard.EnumlessConfig.
 */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
