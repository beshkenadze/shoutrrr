import type { EnumFormatter, Logger } from './types.js';

/**
 * Standard logger mixin mirroring Go's pkg/services/standard.Standard. Holds an
 * optional logger and formats via printf-style %s/%d/%v substitution.
 */
export class Standard implements Logger {
  private logger?: Logger;

  setLogger(logger?: Logger): void {
    this.logger = logger;
  }

  logf(format: string, ...args: unknown[]): void {
    if (this.logger) {
      this.logger.logf(format, ...args);
      return;
    }
    let i = 0;
    const formatted = format.replace(/%[sdv]/g, () =>
      i < args.length ? String(args[i++]) : '',
    );
    // eslint-disable-next-line no-console
    console.log(formatted);
  }
}

/** Config mixin for services that expose no enum fields. */
export class EnumlessConfig {
  enums(): Record<string, EnumFormatter> {
    return {};
  }
}
