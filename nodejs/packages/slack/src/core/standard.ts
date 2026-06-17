import type { EnumFormatter, Logger } from './types.js';

/** sprintf-style formatting for the small subset Go's logf relies on (%v, %q, %s, %d). */
function formatMessage(format: string, args: unknown[]): string {
  let i = 0;
  return format.replace(/%[vqsd%]/g, (token) => {
    if (token === '%%') {
      return '%';
    }
    const arg = args[i++];
    if (token === '%q') {
      return JSON.stringify(arg === undefined ? '' : String(arg));
    }
    return arg === undefined ? '' : String(arg);
  });
}

/**
 * Standard provides a default Logger implementation that services embed
 * (port of Go pkg/services/standard.Standard / Logger).
 */
export class Standard implements Logger {
  private logger: Logger | undefined;

  setLogger(logger?: Logger): void {
    this.logger = logger;
  }

  logf(format: string, ...args: unknown[]): void {
    if (this.logger) {
      this.logger.logf(format, ...args);
      return;
    }
    // eslint-disable-next-line no-console
    console.log(formatMessage(format, args));
  }
}

/** EnumlessConfig is a mixin for configs with no enum fields (port of standard.EnumlessConfig). */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
