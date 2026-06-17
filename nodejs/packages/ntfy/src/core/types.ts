// Core type definitions ported from Go pkg/types.

/** Params is a map of runtime parameters that may override config values per-send. */
export type Params = Record<string, string>;

/** EnumFormatter maps between enum integer values and their string representations. */
export interface EnumFormatter {
  /** Print returns the string representation of the enum value, or "Invalid". */
  print(e: number): string;
  /** Parse returns the integer representation of the string, or -1 if unknown. */
  parse(s: string): number;
  /** Names returns the list of valid enum string values. */
  names(): string[];
}

/** ConfigProp is a custom property that can serialize to/from a single string. */
export interface ConfigProp {
  setFromProp(value: string): void;
  getPropValue(): string;
}

/** Logger is the minimal logging surface used by services. */
export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

/** ServiceConfig is the contract a service configuration must fulfil. */
export interface ServiceConfig {
  getURL(): URL;
  setURL(url: URL): void;
  enums(): Record<string, EnumFormatter>;
}

/** Service is the contract every notification service implements. */
export interface Service {
  initialize(url: URL, logger?: Logger): void;
  setLogger(logger: Logger): void;
  send(message: string, params?: Params): Promise<void>;
}
