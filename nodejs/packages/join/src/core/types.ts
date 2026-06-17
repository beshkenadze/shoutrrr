// Faithful port of Go pkg/types.
// Folded into @shoutrrr/core during dedupe.

/** Params is a key/value map of runtime send parameters. */
export type Params = Record<string, string>;

/** EnumFormatter is the helper interface for enum-like types. */
export interface EnumFormatter {
  /** print returns the string representation of the enum value, or "Invalid". */
  print(e: number): string;
  /** parse returns the int representation of the enum string, or EnumInvalid (-1). */
  parse(s: string): number;
  /** names returns the list of valid enum string values. */
  names(): string[];
}

/** ConfigProp is implemented by types that serialize to/from a single URL prop value. */
export interface ConfigProp {
  setFromProp(value: string): void;
  getPropValue(): string;
}

/** Logger is the subset of the stdlib logger used by services for non-fatal output. */
export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

/** ServiceConfig is the common interface for all service configurations. */
export interface ServiceConfig {
  getURL(): URL;
  setURL(url: URL): void;
  enums(): Record<string, EnumFormatter>;
}

/** Service is the public common interface for all notification services. */
export interface Service {
  initialize(url: URL, logger?: Logger): void;
  setLogger(logger: Logger): void;
  send(message: string, params?: Params): Promise<void>;
}
