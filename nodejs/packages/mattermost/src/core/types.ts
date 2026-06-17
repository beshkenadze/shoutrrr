// Faithful port of Go pkg/types core interfaces.

/** Params is a key/value map of runtime send parameters (port of types.Params). */
export type Params = Record<string, string>;

/** EnumFormatter converts between enum integer values and their string names. */
export interface EnumFormatter {
  print(e: number): string;
  parse(s: string): number;
  names(): string[];
}

/** ConfigProp is a self-(de)serializing config property. */
export interface ConfigProp {
  setFromProp(v: string): void;
  getPropValue(): string;
}

/** Logger is the minimal logging surface a service receives. */
export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

/** ServiceConfig is the URL-(de)serializable configuration for a service. */
export interface ServiceConfig {
  getURL(): URL;
  setURL(u: URL): void;
  enums(): Record<string, EnumFormatter>;
}

/** Service is a notification backend identified by one or more URL schemes. */
export interface Service {
  initialize(u: URL, logger?: Logger): void;
  setLogger(l: Logger): void;
  send(message: string, params?: Params): Promise<void>;
}
