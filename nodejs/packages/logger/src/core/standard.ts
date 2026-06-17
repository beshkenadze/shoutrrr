// Faithful port of Go pkg/services/standard.
// A later dedupe pass folds these into @shoutrrr/core.

import type { EnumFormatter, Logger } from './types.js';

/** A Logger that drops everything, mirroring Go util.DiscardLogger. */
const discardLogger: Logger = {
  logf(): void {
    /* no-op */
  },
};

/**
 * Standard implements the Logger part of the Service interface. Services embed
 * this to gain SetLogger/Logf helpers. When no logger is set, output is
 * discarded (mirrors Go standard.Logger backed by util.DiscardLogger).
 */
export class Standard implements Logger {
  protected logger: Logger = discardLogger;

  setLogger(l?: Logger): void {
    this.logger = l ?? discardLogger;
  }

  logf(format: string, ...args: unknown[]): void {
    this.logger.logf(format, ...args);
  }
}

/** EnumlessConfig implements enums() for services that use no enum fields. */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
