// Faithful port of Go pkg/types (the subset needed by services).

/** Params is a map of runtime parameters passed to Service.send. */
export type Params = Record<string, string>;

/** EnumFormatter prints/parses enum values to and from their string names. */
export interface EnumFormatter {
  print(e: number): string;
  parse(s: string): number;
  names(): string[];
}

/** ConfigProp is a config field that can serialize itself to/from a string. */
export interface ConfigProp {
  setFromProp(v: string): void;
  getPropValue(): string;
}

/** Logger is the logging interface used by services. */
export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

/** ServiceConfig is the configuration backing a Service. */
export interface ServiceConfig {
  getURL(): URL;
  setURL(u: URL): void;
  enums(): Record<string, EnumFormatter>;
}

/** Service is a notification service that can be initialized from a URL and send messages. */
export interface Service {
  initialize(u: URL, logger?: Logger): void;
  setLogger(l: Logger): void;
  send(message: string, params?: Params): Promise<void>;
}
