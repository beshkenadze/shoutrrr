// Faithful port of Go pkg/types core interfaces.

/** Params provides additional variables to the service templates. */
export type Params = Record<string, string>;

/** EnumFormatter translates enums between strings and numbers. */
export interface EnumFormatter {
  print(e: number): string;
  parse(s: string): number;
  names(): string[];
}

/** ConfigProp is implemented by config field types that serialize from/to a single string. */
export interface ConfigProp {
  setFromProp(v: string): void;
  getPropValue(): string;
}

/** Logger is the minimal logging surface used by services for non-fatal output. */
export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

/** ServiceConfig is the common interface for all service configurations. */
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
