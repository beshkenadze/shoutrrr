// Faithful port of Go pkg/types core interfaces.
// A later dedupe pass folds these into @shoutrrr/core.

/** Params is the string map used to provide additional variables to service templates. */
export type Params = Record<string, string>;

/** EnumFormatter maps between enum names and their integer values. */
export interface EnumFormatter {
  print(e: number): string;
  parse(s: string): number;
  names(): string[];
}

/**
 * Logger is the minimal logging sink injected into a service.
 * Mirrors the subset of Go's log.Logger used by shoutrrr (Printf-style).
 */
export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

/** ServiceConfig is the interface implemented by every service configuration. */
export interface ServiceConfig {
  getURL(): URL;
  setURL(u: URL): void;
  enums(): Record<string, EnumFormatter>;
}

/** Service is the public common interface for all notification services. */
export interface Service {
  initialize(u: URL, logger?: Logger): void;
  setLogger(l: Logger): void;
  send(message: string, params?: Params): Promise<void>;
}
