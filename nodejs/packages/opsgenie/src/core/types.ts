// Faithful port of Go pkg/types.
// Match EXACTLY (later dedupe folds into @shoutrrr/core).

/** Params is a map of runtime parameter overrides passed to Service.send. */
export type Params = Record<string, string>;

/** EnumFormatter de-/serializes an integer enum to/from its string representation. */
export interface EnumFormatter {
  print(e: number): string;
  parse(s: string): number;
  names(): string[];
}

/** ConfigProp de-/serializes a struct from/to a string representation. */
export interface ConfigProp {
  setFromProp(value: string): void;
  getPropValue(): string;
}

/** Logger is the logging surface used by services. */
export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

/** ServiceConfig is the URL-backed configuration of a service. */
export interface ServiceConfig {
  getURL(): URL;
  setURL(u: URL): void;
  enums(): Record<string, EnumFormatter>;
}

/** Service is a notification service. */
export interface Service {
  initialize(u: URL, logger?: Logger): void;
  setLogger(l: Logger): void;
  send(message: string, params?: Params): Promise<void>;
}
