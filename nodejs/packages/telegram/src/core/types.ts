// Vendored core types — faithful port of Go pkg/types.
// (Later dedupe folds this into @shoutrrr/core.)

/** Params is a map of runtime parameter overrides passed to Send. */
export type Params = Record<string, string>;

/** EnumFormatter is the helper interface for enum-like types. */
export interface EnumFormatter {
  print(e: number): string;
  parse(s: string): number;
  names(): string[];
}

/** ConfigProp is a custom property that can serialize to/from a single string. */
export interface ConfigProp {
  setFromProp(v: string): void;
  getPropValue(): string;
}

/** Logger is the minimal logging surface used by services. */
export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

/** ServiceConfig is the configuration contract for a service. */
export interface ServiceConfig {
  getURL(): URL;
  setURL(u: URL): void;
  enums(): Record<string, EnumFormatter>;
}

/** Service is the contract every notification service implements. */
export interface Service {
  initialize(u: URL, logger?: Logger): void;
  setLogger(l: Logger): void;
  send(message: string, params?: Params): Promise<void>;
}

/** EnumInvalid is the value an enum gets when it could not be parsed. */
export const EnumInvalid = -1;
