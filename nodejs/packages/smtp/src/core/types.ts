// Vendored from Go pkg/types. Faithful port of the core type contracts.
// Later dedupe folds this into @shoutrrr/core.

/** Params is a map of send-time parameter overrides (Go: types.Params). */
export type Params = Record<string, string>;

/**
 * EnumFormatter is the helper for enum-like types (Go: types.EnumFormatter).
 * print returns the string for an int (or "Invalid"); parse returns the int
 * for a string (case-insensitive) or -1 if unknown; names lists valid values.
 */
export interface EnumFormatter {
  print(e: number): string;
  parse(s: string): number;
  names(): string[];
}

/** Logger is the minimal logging contract used by services (Go: standard logger). */
export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

/** ServiceConfig is the configuration contract (Go: types.ServiceConfig). */
export interface ServiceConfig {
  getURL(): URL;
  setURL(u: URL): void;
  enums(): Record<string, EnumFormatter>;
}

/** Service is the notification service contract (Go: types.Service). */
export interface Service {
  initialize(u: URL, logger?: Logger): void;
  setLogger(l: Logger): void;
  send(message: string, params?: Params): Promise<void>;
}
