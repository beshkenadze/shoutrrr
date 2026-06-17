// Faithful port of Go pkg/types. Shared core kit (later folds into @shoutrrr/core).

export type Params = Record<string, string>;

export interface EnumFormatter {
  print(e: number): string;
  parse(s: string): number;
  names(): string[];
}

/** ConfigProp is a config field that serializes to/from a single string (port of types.ConfigProp). */
export interface ConfigProp {
  setFromProp(value: string): void;
  getPropValue(): string;
}

export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

export interface ServiceConfig {
  getURL(): URL;
  setURL(u: URL): void;
  enums(): Record<string, EnumFormatter>;
}

export interface Service {
  initialize(u: URL, logger?: Logger): void;
  setLogger(l: Logger): void;
  send(message: string, params?: Params): Promise<void>;
}
